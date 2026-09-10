/**
 * Non-destructive FTP deploy of the built frontend to Plesk.
 *
 *   npm run deploy            build, then upload build/ to the FTP target
 *   npm run deploy:nobuild    upload the existing build/ (no rebuild)
 *   npm run deploy:dry        show what would upload, connect but write nothing
 *
 * Flags (pass after `--`, e.g. `npm run deploy:nobuild -- --force`):
 *   --dry-run, -n    list actions, upload nothing
 *   --force,   -f    re-upload every file even if the remote size already matches
 *   --verbose, -v    print the raw FTP command/response log
 *
 * Why non-destructive: this only ever creates/overwrites the files that exist
 * in build/. It never deletes anything on the server, so:
 *   - unrelated files living in the same web root (PHP helpers, .htaccess,
 *     uploads, whatever else is in there) are left untouched;
 *   - old hashed asset chunks stay in place, so a browser tab still running a
 *     previous build can keep lazy-loading its chunks instead of white-screening
 *     (this is the same failure the vite.config.js CSS-splitting comment and
 *     src/utils/lazyWithRetry.js are about).
 *
 * Upload order: everything EXCEPT the HTML entry files goes up first, then the
 * HTML last — so the moment index.html points at a new chunk, that chunk is
 * already on the server.
 *
 * Config: front/deploy.config.json (gitignored). See deploy.config.example.json.
 * Env vars (FTP_HOST, FTP_PORT, FTP_USER, FTP_PASSWORD, FTP_SECURE,
 * FTP_TLS_STRICT, FTP_REMOTE_DIR) override the file, for CI.
 */
import { Client } from 'basic-ftp';
import cliProgress from 'cli-progress';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOCAL_DIR = path.join(ROOT, 'build');

/* ------------------------------------------------------------------ args --- */
const argv = process.argv.slice(2);
const has = (...names) => names.some((n) => argv.includes(n));
const DRY_RUN = has('--dry-run', '-n');
const FORCE = has('--force', '-f');
const VERBOSE = has('--verbose', '-v');

/* ---------------------------------------------------------------- config --- */
const CONFIG_FILE = path.join(ROOT, 'deploy.config.json');
let fileCfg = {};
if (fs.existsSync(CONFIG_FILE)) {
  try {
    fileCfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    die(`deploy.config.json is not valid JSON: ${e.message}`);
  }
} else {
  die('no deploy.config.json — copy deploy.config.example.json to deploy.config.json and fill it in.');
}

const pick = (envKey, fileKey, fallback) =>
  process.env[envKey] !== undefined ? process.env[envKey] : (fileCfg[fileKey] ?? fallback);
const asBool = (v, dflt) =>
  v === undefined || v === '' ? dflt : !/^(0|false|no|off)$/i.test(String(v));

const HOST = pick('FTP_HOST', 'host');
const PORT = Number(pick('FTP_PORT', 'port', 21));
const USER = pick('FTP_USER', 'user');
const PASSWORD = pick('FTP_PASSWORD', 'password');
const SECURE = /^implicit$/i.test(String(pick('FTP_SECURE', 'secure', 'true')))
  ? 'implicit'
  : asBool(pick('FTP_SECURE', 'secure', 'true'), true);
const TLS_STRICT = asBool(pick('FTP_TLS_STRICT', 'tlsStrict', 'false'), false);
const REMOTE_ROOT =
  '/' + String(pick('FTP_REMOTE_DIR', 'remoteDir', '/')).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

const mb = (b) => `${(b / 1048576).toFixed(2)} MB`;
function die(msg) {
  console.error(`\n  deploy error: ${msg}\n`);
  process.exit(1);
}

if (!fs.existsSync(LOCAL_DIR)) {
  die(`no build at ${path.relative(ROOT, LOCAL_DIR)}/ — run "npm run build" first (or use "npm run deploy").`);
}
for (const [k, v] of Object.entries({ host: HOST, user: USER, password: PASSWORD })) {
  if (!v) die(`"${k}" is empty in deploy.config.json (or its FTP_* env var).`);
}

/* ----------------------------------------------------------- scan build/ --- */
async function walk(dir, base) {
  const out = [];
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else if (entry.isFile()) {
      const rel = path.relative(base, full).split(path.sep).join('/');
      out.push({ local: full, rel, size: (await fsp.stat(full)).size });
    }
  }
  return out;
}

// What can be skipped when the remote already has a byte-identical-sized copy:
//   - Hashed asset chunks (`name-8+chars.ext`): a matching name == matching
//     content, so size match == identical. 100% safe.
//   - Static files copied from public/ (images, fonts, …): a real edit to one
//     of these virtually always changes its size. Good enough, and `--force`
//     re-sends everything if you need it.
// What is ALWAYS re-uploaded (small, and a content change may not change the
// byte count): the HTML entry files and the handful of dynamic root files.
const isEntryHtml = (rel) => rel.toLowerCase().endsWith('.html');
const ALWAYS_UPLOAD = new Set([
  'manifest.json', 'sw.js', 'service-worker.js', 'sw.dev.js',
  '.htaccess', 'robots.txt', 'sitemap.xml', 'ads.txt',
  'analytics-init.js', 'cache-purge.js', 'theme-init.js', 'version.json',
]);
const alwaysUpload = (rel) =>
  isEntryHtml(rel) || ALWAYS_UPLOAD.has(rel) || ALWAYS_UPLOAD.has(rel.split('/').pop());

const files = await walk(LOCAL_DIR, LOCAL_DIR);
files.sort((a, b) => {
  const ah = isEntryHtml(a.rel) ? 1 : 0;
  const bh = isEntryHtml(b.rel) ? 1 : 0;
  return ah - bh || a.rel.localeCompare(b.rel); // non-HTML first, then HTML
});

if (files.length === 0) die('build/ is empty.');

/* ------------------------------------------------------------- ftp client -- */
const client = new Client(30_000);
client.ftp.verbose = VERBOSE;

const remotePathFor = (rel) => path.posix.join(REMOTE_ROOT || '/', rel);

console.log(
  `\n  ${DRY_RUN ? 'DRY RUN — ' : ''}deploying ${files.length} files ` +
    `(${mb(files.reduce((n, f) => n + f.size, 0))})\n` +
    `  from  ${path.relative(ROOT, LOCAL_DIR)}/\n` +
    `  to    ${USER}@${HOST}:${PORT}${REMOTE_ROOT || '/'}  ` +
    `(${SECURE === true ? 'FTPS' : SECURE === 'implicit' ? 'FTPS implicit' : 'plain FTP'})\n`,
);

let uploaded = 0;
let skipped = 0;
let sentBytes = 0;
const startedAt = Date.now();

try {
  await client.access({
    host: HOST,
    port: PORT,
    user: USER,
    password: PASSWORD,
    secure: SECURE,
    secureOptions: { rejectUnauthorized: TLS_STRICT },
  });

  // ---- decide what actually needs uploading (compare against remote sizes) --
  // One directory listing per remote folder, cached — cheaper and more portable
  // than a SIZE round-trip per file.
  process.stdout.write('  checking remote files… ');
  const remoteSizes = new Map();
  const listedDirs = new Set();
  async function remoteSizeOf(remoteAbs) {
    const dir = path.posix.dirname(remoteAbs);
    if (!listedDirs.has(dir)) {
      listedDirs.add(dir);
      try {
        for (const item of await client.list(dir)) {
          if (item.isFile) remoteSizes.set(path.posix.join(dir, item.name), item.size);
        }
      } catch {
        /* remote dir doesn't exist yet */
      }
    }
    return remoteSizes.get(remoteAbs) ?? -1;
  }

  const plan = [];
  for (const f of files) {
    const remote = remotePathFor(f.rel);
    const remoteSize =
      !FORCE && !alwaysUpload(f.rel) ? await remoteSizeOf(remote) : -1;
    if (remoteSize === f.size) skipped++;
    else plan.push({ ...f, remote });
  }
  console.log(`${skipped} unchanged, ${plan.length} to upload\n`);

  const plannedBytes = plan.reduce((n, f) => n + f.size, 0);

  if (plan.length === 0) {
    console.log('  nothing to do — remote is already up to date.\n');
  } else if (DRY_RUN) {
    for (const f of plan) console.log(`  would upload  ${f.rel}  (${mb(f.size)})`);
    console.log(`\n  ${plan.length} files, ${mb(plannedBytes)}\n`);
  } else {
    const useBars = process.stdout.isTTY;
    const bars = useBars
      ? new cliProgress.MultiBar(
          {
            format: '  {bar} {percentage}% │ {value_mb}/{total_mb} │ {name}',
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true,
            clearOnComplete: false,
            autopadding: true,
          },
          cliProgress.Presets.shades_grey,
        )
      : null;
    const fmtBar = (b, val, total, name) =>
      b?.update(val, {
        name,
        value_mb: mb(val).replace(' MB', ''),
        total_mb: mb(total).replace(' MB', ''),
      });

    const overall = bars?.create(plannedBytes, 0, {
      name: 'TOTAL',
      value_mb: '0.00',
      total_mb: mb(plannedBytes).replace(' MB', ''),
    });

    const ensured = new Set();
    let fileBar = null;
    let currentRel = '';
    let currentSize = 0;
    let baseBytes = 0; // bytes from files already finished

    client.trackProgress((info) => {
      if (info.type !== 'upload') return;
      const n = Math.min(info.bytes, currentSize || info.bytes);
      fmtBar(fileBar, n, currentSize || info.bytes, currentRel);
      fmtBar(overall, baseBytes + n, plannedBytes, 'TOTAL');
    });

    for (const f of plan) {
      currentRel = f.rel;
      currentSize = f.size;
      const dir = path.posix.dirname(f.remote);
      if (dir && dir !== '/' && !ensured.has(dir)) {
        await client.ensureDir(dir); // creates missing segments, cwd ends inside dir
        await client.cd(REMOTE_ROOT || '/');
        ensured.add(dir);
      }

      if (useBars) {
        fileBar = bars.create(f.size, 0, {
          name: f.rel,
          value_mb: '0.00',
          total_mb: mb(f.size).replace(' MB', ''),
        });
      } else {
        process.stdout.write(`  ↑ ${f.rel} … `);
      }

      await client.uploadFrom(f.local, f.remote);

      uploaded++;
      sentBytes += f.size;
      baseBytes += f.size;
      if (useBars) {
        fmtBar(fileBar, f.size, f.size, f.rel);
        fmtBar(overall, baseBytes, plannedBytes, 'TOTAL');
        bars.remove(fileBar);
        fileBar = null;
      } else {
        console.log('done');
      }
    }

    client.trackProgress();
    fmtBar(overall, plannedBytes, plannedBytes, 'TOTAL');
    bars?.stop();
  }
} catch (err) {
  client.trackProgress?.();
  const hint =
    err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN'
      ? `\n  → host "${HOST}" did not resolve. Check "host" in deploy.config.json.`
      : err.code === 'ECONNREFUSED'
        ? `\n  → connection refused on port ${PORT}. Wrong port, or the server isn't accepting FTP there.`
        : /530|not logged in|login/i.test(err.message)
          ? '\n  → login rejected. Check "user" / "password" in deploy.config.json.'
          : /certificate|self.signed|altnames|SSL|TLS/i.test(err.message)
            ? '\n  → TLS handshake failed. Set "tlsStrict": false, or "secure": false if the server has no FTPS.'
            : '';
  console.error(`\n  deploy failed: ${err.message}${hint}\n`);
  client.close();
  process.exit(1);
}

client.close();

const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(
  `\n  ${DRY_RUN ? 'dry run complete' : 'deploy complete'} — ` +
    `${uploaded} uploaded (${mb(sentBytes)}), ${skipped} unchanged, ${secs}s\n` +
    (DRY_RUN || uploaded === 0 ? '' : `  live: https://${HOST.replace(/^ftp\./, '')}/\n`),
);
