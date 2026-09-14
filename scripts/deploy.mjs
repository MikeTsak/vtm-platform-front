/**
 * Non-destructive FTP deploy of the built frontend to Plesk with colored terminal output.
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
 *   * unrelated files living in the same web root (PHP helpers, .htaccess,
 *     uploads, whatever else is in there) are left untouched;
 *   * old hashed asset chunks stay in place, so a browser tab still running a
 *     previous build can keep lazy-loading its chunks instead of white-screening
 *     (this is the same failure the vite.config.js CSS-splitting comment and
 *     src/utils/lazyWithRetry.js are about).
 *
 * Upload order: everything EXCEPT the HTML entry files goes up first, then the
 * HTML last, so the moment index.html points at a new chunk, that chunk is
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
import { Readable, Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOCAL_DIR = path.join(ROOT, 'build');

/* ------------------------------------------------------------------ colors --- */
const isColorSupported =
  !process.env.NO_COLOR && (Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR));

const c = {
  red: (s) => (isColorSupported ? `\x1b[31m${s}\x1b[0m` : s),
  green: (s) => (isColorSupported ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (isColorSupported ? `\x1b[33m${s}\x1b[0m` : s),
  cyan: (s) => (isColorSupported ? `\x1b[36m${s}\x1b[0m` : s),
  bold: (s) => (isColorSupported ? `\x1b[1m${s}\x1b[0m` : s),
  dim: (s) => (isColorSupported ? `\x1b[2m${s}\x1b[0m` : s),
  boldRed: (s) => (isColorSupported ? `\x1b[1;31m${s}\x1b[0m` : s),
  boldYellow: (s) => (isColorSupported ? `\x1b[1;33m${s}\x1b[0m` : s),
  boldGreen: (s) => (isColorSupported ? `\x1b[1;32m${s}\x1b[0m` : s),
  boldCyan: (s) => (isColorSupported ? `\x1b[1;36m${s}\x1b[0m` : s),
};

function printError(title, lines = []) {
  console.error('\n' + c.boldRed('========================================================================'));
  console.error(c.boldRed(`  ERROR: ${title}`));
  console.error(c.boldRed('========================================================================'));
  for (const line of lines) {
    console.error(`  ${line}`);
  }
  console.error(c.boldRed('========================================================================\n'));
}

function printWarning(title, lines = []) {
  console.warn('\n' + c.boldYellow('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'));
  console.warn(c.boldYellow(`  WARNING: ${title}`));
  console.warn(c.boldYellow('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'));
  for (const line of lines) {
    console.warn(`  ${line}`);
  }
  console.warn(c.boldYellow('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n'));
}

/* ------------------------------------------------------------------ args --- */
const argv = process.argv.slice(2);
const has = (...names) => names.some((n) => argv.includes(n));
const DRY_RUN = has('--dry-run', '-n');
const FORCE = has('--force', '-f');
const VERBOSE = has('--verbose', '-v');
const ROLLBACK = has('--rollback');
const NO_PING = has('--no-ping', '-P');

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
  die('no deploy.config.json found. Copy deploy.config.example.json to deploy.config.json and fill it in.');
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
const SITE_URL = String(
  pick('SITE_URL', 'siteUrl', `https://${HOST.replace(/^ftp\./, '')}/`),
).replace(/\/+$/, '') + '/';

const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
const mb = (b) => `${(b / 1048576).toFixed(2)} MB`;
function die(msg, lines = []) {
  printError(msg, lines);
  process.exit(1);
}

async function getRemoteBuffer(remoteClient, remotePath) {
  const chunks = [];
  const writer = new Writable({
    write(chunk, encoding, cb) {
      chunks.push(chunk);
      cb();
    },
  });
  try {
    await remoteClient.downloadTo(writer, remotePath);
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

function extractMainAsset(indexPath) {
  try {
    if (!fs.existsSync(indexPath)) return null;
    const content = fs.readFileSync(indexPath, 'utf8');
    const match = content.match(/src="(\/assets\/index-[^"]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function verifyLiveSite(siteUrl, expectedAsset) {
  process.stdout.write(`  verifying live site at ${c.boldCyan(siteUrl)}... `);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(siteUrl, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        'User-Agent': 'VampirePlatform DeployChecker/1.0',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.log(c.boldYellow(`HTTP ${res.status} ${res.statusText}`));
      printWarning('Live site responded with unexpected status code', [
        `URL: ${siteUrl}`,
        `Status: ${res.status} ${res.statusText}`,
        'The web server or htaccess configuration may need review.',
      ]);
      return { ok: false, status: res.status };
    }

    const html = await res.text();
    const bundleMatch = expectedAsset ? html.includes(expectedAsset) : true;

    if (expectedAsset && !bundleMatch) {
      console.log(c.boldYellow('HTTP 200 (bundle hash mismatch)'));
      printWarning('Live site returned 200 OK, but served HTML differs from local build', [
        `Expected asset reference: ${expectedAsset}`,
        'Browser cache, server cache, or CDN may still be serving previous version.',
        'Wait a few moments or purge cache if immediate updates are required.',
      ]);
      return { ok: true, cached: true, status: 200 };
    }

    console.log(c.green(`HTTP 200 OK${expectedAsset ? ' (bundle hash verified)' : ''}`));
    return { ok: true, cached: false, status: 200 };
  } catch (err) {
    console.log(c.boldYellow('unreachable'));
    printWarning('Could not reach live site for verification', [
      `URL: ${siteUrl}`,
      `Error: ${err.message}`,
      'This may be a local DNS or outbound network timeout and does not indicate upload failure.',
    ]);
    return { ok: false, error: err.message };
  }
}

if (!ROLLBACK && !fs.existsSync(LOCAL_DIR)) {
  die(`no build directory at ${path.relative(ROOT, LOCAL_DIR)}/`, [
    'Run "npm run build" first (or use "npm run deploy").',
  ]);
}
for (const [k, v] of Object.entries({ host: HOST, user: USER, password: PASSWORD })) {
  if (!v) die(`"${k}" is empty in deploy.config.json or FTP_* environment variables.`);
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
//   * Hashed asset chunks: matching name means matching content
//   * Static files copied from public/ (images, fonts)
// What is ALWAYS re-uploaded: HTML entry files and dynamic root files
const isEntryHtml = (rel) => rel.toLowerCase().endsWith('.html');
const ALWAYS_UPLOAD = new Set([
  'manifest.json',
  'sw.js',
  'service-worker.js',
  'sw.dev.js',
  '.htaccess',
  'robots.txt',
  'sitemap.xml',
  'ads.txt',
  'analytics-init.js',
  'cache-purge.js',
  'theme-init.js',
  'version.json',
]);
const alwaysUpload = (rel) =>
  isEntryHtml(rel) || ALWAYS_UPLOAD.has(rel) || ALWAYS_UPLOAD.has(rel.split('/').pop());

/* ------------------------------------------------------------- ftp client -- */
const client = new Client(30_000);
client.ftp.verbose = VERBOSE;

const remotePathFor = (rel) => path.posix.join(REMOTE_ROOT || '/', rel);
const startedAt = Date.now();

/* -------------------------------------------------------- rollback mode --- */
if (ROLLBACK) {
  console.log(
    `\n  ${c.boldYellow('ROLLBACK MODE:')} restoring previous frontend entry point\n` +
      `  target: ${c.cyan(`${USER}@${HOST}:${PORT}${REMOTE_ROOT || '/'}`)} ` +
      `(${SECURE === true ? 'FTPS' : SECURE === 'implicit' ? 'FTPS implicit' : 'plain FTP'})\n`,
  );

  try {
    process.stdout.write(`  connecting to ${c.boldCyan(`${USER}@${HOST}:${PORT}`)}... `);
    await client.access({
      host: HOST,
      port: PORT,
      user: USER,
      password: PASSWORD,
      secure: SECURE,
      secureOptions: { rejectUnauthorized: TLS_STRICT },
    });
    console.log(c.green('connected'));

    const remoteIndex = remotePathFor('index.html');
    const remotePrev = remotePathFor('index.html.prev');

    process.stdout.write('  fetching previous backup from remote server... ');
    const prevBuffer = await getRemoteBuffer(client, remotePrev);

    if (!prevBuffer || prevBuffer.length === 0) {
      console.log(c.boldRed('NOT FOUND'));
      client.close();
      die('No rollback file (index.html.prev) found on remote server.', [
        'A previous deployment backup must exist before rollback can be performed.',
      ]);
    }
    console.log(c.green(`found (${kb(prevBuffer.length)})`));

    process.stdout.write('  restoring index.html from index.html.prev... ');
    await client.uploadFrom(Readable.from(prevBuffer), remoteIndex);
    console.log(c.green('done'));

    client.close();

    let liveStatus = null;
    if (!NO_PING) {
      liveStatus = await verifyLiveSite(SITE_URL, null);
    }

    const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      '\n' +
        c.boldGreen('========================================================================\n') +
        c.boldGreen('  FRONTEND ROLLBACK SUCCESSFUL\n') +
        c.boldGreen('========================================================================\n') +
        `  ${c.bold('restored:')}    ${c.boldGreen('index.html from index.html.prev')} (${kb(prevBuffer.length)})\n` +
        `  ${c.bold('duration:')}    ${secs}s\n` +
        `  ${c.bold('target:')}      ${c.cyan(`${USER}@${HOST}:${PORT}${REMOTE_ROOT || '/'}`)}\n` +
        `  ${c.bold('live url:')}    ${c.boldCyan(SITE_URL)}\n` +
        (liveStatus ? `  ${c.bold('live check:')}  ${liveStatus.ok ? c.green('HTTP 200 OK') : c.yellow('warning')}\n` : '') +
        c.boldGreen('========================================================================\n'),
    );
  } catch (err) {
    client.close();
    die(`rollback failed: ${err.message}`);
  }
} else {
const files = await walk(LOCAL_DIR, LOCAL_DIR);
files.sort((a, b) => {
  const ah = isEntryHtml(a.rel) ? 1 : 0;
  const bh = isEntryHtml(b.rel) ? 1 : 0;
  return ah - bh || a.rel.localeCompare(b.rel);
});

if (files.length === 0) die('build directory is empty.');

console.log(
  `\n  ${DRY_RUN ? c.boldYellow('DRY RUN: ') : ''}deploying ${c.boldCyan(`${files.length} files`)} ` +
    `(${mb(files.reduce((n, f) => n + f.size, 0))})\n` +
    `  source: ${c.dim(path.relative(ROOT, LOCAL_DIR) + '/')}\n` +
    `  target: ${c.cyan(`${USER}@${HOST}:${PORT}${REMOTE_ROOT || '/'}`)} ` +
    `(${SECURE === true ? 'FTPS' : SECURE === 'implicit' ? 'FTPS implicit' : 'plain FTP'})\n`,
);

let uploaded = 0;
let skipped = 0;
let sentBytes = 0;
let backedUpIndex = false;

try {
  process.stdout.write(`  connecting to ${c.boldCyan(`${USER}@${HOST}:${PORT}`)}... `);
  await client.access({
    host: HOST,
    port: PORT,
    user: USER,
    password: PASSWORD,
    secure: SECURE,
    secureOptions: { rejectUnauthorized: TLS_STRICT },
  });
  console.log(c.green('connected'));

  // Decide what needs uploading by comparing remote file sizes
  process.stdout.write('  checking remote files... ');
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
        /* remote directory does not exist yet */
      }
    }
    return remoteSizes.get(remoteAbs) ?? -1;
  }

  const plan = [];
  for (const f of files) {
    const remote = remotePathFor(f.rel);
    const remoteSize = !FORCE && !alwaysUpload(f.rel) ? await remoteSizeOf(remote) : -1;
    if (remoteSize === f.size) skipped++;
    else plan.push({ ...f, remote });
  }
  console.log(`${c.green(`${skipped} unchanged`)}, ${c.boldCyan(`${plan.length} to upload`)}\n`);

  const plannedBytes = plan.reduce((n, f) => n + f.size, 0);

  if (plan.length === 0) {
    console.log(c.green('  nothing to do: remote server is already up to date.\n'));
  } else if (DRY_RUN) {
    for (const f of plan) {
      if (f.rel === 'index.html') {
        console.log(`  would backup: ${c.cyan('index.html')} to ${c.cyan('index.html.prev')}`);
      }
      console.log(`  would upload: ${c.cyan(f.rel)} ${c.dim(`(${mb(f.size)})`)}`);
    }
    console.log(`\n  ${c.boldCyan(`${plan.length} files`)}, ${c.bold(mb(plannedBytes))}\n`);
  } else {
    const useBars = Boolean(process.stdout.isTTY);
    let bar = null;
    if (useBars) {
      bar = new cliProgress.SingleBar(
        {
          format: '  uploading: [{bar}] {percentage}% | {value_mb}/{total_mb} MB',
          barCompleteChar: '█',
          barIncompleteChar: '░',
          hideCursor: true,
          clearOnComplete: false,
        },
        cliProgress.Presets.shades_grey,
      );
      bar.start(1000, 0, {
        value_mb: '0.00',
        total_mb: (plannedBytes / 1048576).toFixed(2),
      });
    }

    const ensured = new Set();
    let currentUploadedBytes = 0;

    for (const f of plan) {
      const dir = path.posix.dirname(f.remote);
      if (dir && dir !== '/' && !ensured.has(dir)) {
        await client.ensureDir(dir);
        await client.cd(REMOTE_ROOT || '/');
        ensured.add(dir);
      }

      if (f.rel === 'index.html' && !DRY_RUN) {
        try {
          const remotePrevPath = remotePathFor('index.html.prev');
          const existingIndexBuffer = await getRemoteBuffer(client, f.remote);
          if (existingIndexBuffer && existingIndexBuffer.length > 0) {
            await client.uploadFrom(Readable.from(existingIndexBuffer), remotePrevPath);
            backedUpIndex = true;
          }
        } catch {
          /* non fatal backup */
        }
      }

      if (!useBars) {
        process.stdout.write(`  uploading: ${c.cyan(f.rel)} ... `);
      }

      await client.uploadFrom(f.local, f.remote);

      uploaded++;
      sentBytes += f.size;
      currentUploadedBytes += f.size;

      if (useBars && bar) {
        const frac = plannedBytes > 0 ? Math.min(1, currentUploadedBytes / plannedBytes) : 1;
        bar.update(Math.round(frac * 1000), {
          value_mb: (currentUploadedBytes / 1048576).toFixed(2),
          total_mb: (plannedBytes / 1048576).toFixed(2),
        });
      } else {
        console.log(c.green('done'));
      }
    }

    if (useBars && bar) {
      bar.update(1000, {
        value_mb: (plannedBytes / 1048576).toFixed(2),
        total_mb: (plannedBytes / 1048576).toFixed(2),
      });
      bar.stop();
      process.stdout.write('\n');
    }
  }
} catch (err) {
  client.trackProgress?.();
  const hint =
    err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN'
      ? `Host "${HOST}" did not resolve. Check "host" in deploy.config.json.`
      : err.code === 'ECONNREFUSED'
        ? `Connection refused on port ${PORT}. Wrong port, or the server is not accepting FTP there.`
        : /530|not logged in|login/i.test(err.message)
          ? 'Login rejected. Check "user" and "password" in deploy.config.json.'
          : /certificate|self.signed|altnames|SSL|TLS/i.test(err.message)
            ? 'TLS handshake failed. Set "tlsStrict": false, or "secure": false if the server has no FTPS.'
            : '';
  client.close();
  die(`deploy failed: ${err.message}`, hint ? [hint] : []);
}

client.close();

let liveStatus = null;
if (!DRY_RUN && !NO_PING && uploaded > 0) {
  const mainAsset = extractMainAsset(path.join(LOCAL_DIR, 'index.html'));
  liveStatus = await verifyLiveSite(SITE_URL, mainAsset);
}

const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(
  '\n' +
    c.boldGreen('========================================================================\n') +
    c.boldGreen(`  ${DRY_RUN ? 'DRY RUN COMPLETE' : 'FRONTEND DEPLOY SUCCESSFUL'}\n`) +
    c.boldGreen('========================================================================\n') +
    `  ${c.bold('uploaded:')}    ${c.boldGreen(`${uploaded} files`)} (${mb(sentBytes)})\n` +
    `  ${c.bold('unchanged:')}   ${c.green(`${skipped} files`)}\n` +
    (backedUpIndex ? `  ${c.bold('backup:')}      ${c.green('index.html saved to index.html.prev')}\n` : '') +
    `  ${c.bold('duration:')}    ${secs}s\n` +
    `  ${c.bold('target:')}      ${c.cyan(`${USER}@${HOST}:${PORT}${REMOTE_ROOT || '/'}`)}\n` +
    (DRY_RUN || uploaded === 0 ? '' : `  ${c.bold('live url:')}    ${c.boldCyan(SITE_URL)}\n`) +
    (liveStatus ? `  ${c.bold('live check:')}  ${liveStatus.ok ? (liveStatus.cached ? c.yellow('HTTP 200 (cache pending)') : c.green('HTTP 200 OK (verified)')) : c.yellow('unverified')}\n` : '') +
    c.boldGreen('========================================================================\n'),
);
}

