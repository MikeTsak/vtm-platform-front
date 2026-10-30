<div align="center">

# Erebus Portal

**The player and Storyteller portal for the Athens Through Time *Vampire: The Masquerade* V5 LARP.**

Character sheets, the Athens domain map, Court politics, in-fiction comms, live sessions and the full Storyteller console, in one React app.

[![React](https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?style=flat-square&logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![deck.gl](https://img.shields.io/badge/deck.gl_%2B_MapLibre-9-0E1116?style=flat-square)](https://deck.gl)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue?style=flat-square)](LICENSE.txt)

[Open the portal](https://portal.attlarp.gr) · [API](https://github.com/MikeTsak/vtm-platform-back)

</div>

---

## Features

### For players

- **Character creation and sheets.** A guided V5 creation wizard, a full sheet view, past and retired characters, and a wishlist.
- **XP shop.** The server prices and applies every purchase. Activated characters' training counts toward the downtime allowance.
- **Domains.** An interactive Athens map (deck.gl and MapLibre) with claims, hunting difficulty, Chasse merits, guests, and transit overlays.
- **Feeding.** Up to three rolled hunts per cycle, Herd, and ghoul upkeep.
- **Downtimes.** Submit actions each cycle and read the Storyteller's resolutions.
- **Coteries and retainers.** Shared pools and coterie-owned retainers.
- **Comms.** SchreckNet chat, Surface Web email, anonymous notes, and drafts written while comms are closed. Comms open and close with the calendar.
- **Court.** Hierarchy, announcements, boons, Court Actions for officers, news, rumours, and premonitions.
- **Live sessions.** A player view with server-side dice, 3D d10s, and a rules codex sidebar.
- **Inventory.** Items and QR trading: scan `/item/:code` to receive or pass an item.

### For Storytellers

The admin console at `/admin` has tabs for users, characters, NPCs, coteries, XP, downtimes, feeding, ghouls, domains and claims, the calendar, events, timeline, news, premonitions, boons, prestation, Masquerade, Court actions, Elysium, inventory, wishlists, disciplines, broadcast, Discord, chat and dice logs, the audit log, a blood-web relationship graph, a knowledge base, and the live-session dashboard.

### Platform

- Cookie-based auth (`withCredentials`). The app never handles a token.
- Realtime updates over Socket.IO.
- Theme system with `data-theme` palettes and a per-clan tint, applied before first paint by `public/theme-init.js`.
- Boneyard skeleton screens while data loads.
- PWA service worker, plus a `/cache` page for a hard refresh.

## Quick start

**Requirements:** Node.js 20+, and the [API](https://github.com/MikeTsak/vtm-platform-back) running on `http://127.0.0.1:3001`.

```bash
npm install
npm run dev
```

The dev server opens on **http://localhost:3002** and proxies `/api` and `/public` to the API on port 3001, so local cookies just work.

### Environment

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Axios base URL, including `/api`. Use `/api` locally (through the proxy) or the full production URL. |
| `VITE_API_BASE` | Optional override used by a few raw `fetch` and SSE callers (admin logs, premonitions) |

Vite reads `.env` in development and `.env.production` for builds. Restart the dev server after changing them.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3002 |
| `npm run build` | Production build into `build/` |
| `npm run preview` | Serve the production build locally |
| `npm run dev:bones` / `npm run bones` | Boneyard capture mode, then regenerate skeletons into `src/bones` |
| `npm run doctor` | React Doctor static analysis (also runs in CI) |
| `npm run deploy` | Build, then upload to production over FTPS |
| `npm run deploy:nobuild` | Upload the existing `build/` |
| `npm run deploy:dry` | Show what would change without uploading |
| `npm run deploy:force` | Build and re-upload every file |
| `npm run deploy:rollback` | Restore the previous `index.html` on the server |

## Project structure

```text
src/
  core/        App.jsx (routes), api.js, AuthContext, ThemeContext, useRole
  features/    one folder per domain:
               admin, auth, character, coterie, court, domains, feeding, downtimes,
               comms (schrecknet, surfaceweb, notes, drafts), chat, email, news,
               announcements, boons, premonitions, live-session, dice, inventory,
               npcs, notification, xp-shop, shatter
  ui/          shared layout: Nav, Footer, Loading, ErrorBoundary, D10Die, dice3d
  components/  shared widgets: Avatar, cropper, banners, editor toolbar, modals
  pages/       standalone pages: Home, 404, Legal, Privacy, Terms, MediaViewer
  data/        V5 rules data (disciplines, merits, rituals, predator types) and
               Athens GeoJSON; the API compiles its rules catalog from here
  store/       Zustand store
  styles/      CSS Modules, mirroring features/
  bones/ bone/ generated by Boneyard; do not edit by hand
```

The V5 rules data in `src/data` is the single source of truth. After editing it, run `npm run catalog` in the API repo so the server's pricing matches.

## Deployment

`npm run deploy` builds and pushes `build/` to `portal.attlarp.gr` over FTPS. It is **non-destructive**: it only creates or overwrites files that exist in `build/` and never deletes anything on the server, so `.htaccess`, PHP helpers and old hashed chunks stay in place. Unchanged files are skipped. HTML and the dynamic root files (`manifest.json`, the service worker) are always re-uploaded, HTML last, so users never load a page whose chunks aren't there yet.

The first time, copy `deploy.config.example.json` to `deploy.config.json` (gitignored) and fill in the FTP credentials.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Every request is 401 locally | Make sure the API runs on port 3001 and you're on `localhost:3002`, so the proxy keeps cookies same-origin. |
| A colour utility like `bg-primary/10` renders nothing | Theme colours are CSS variables, so Tailwind's opacity modifier can't compile them. Use `color-mix()` in a CSS Module instead. |
| A stale UI after a deploy | Visit `/cache` to clear the service worker and caches. |
| 403 in the admin console | The account's role isn't `admin`. Roles are read live from the database. |

## The Erebus ecosystem

| Repository | Role |
| --- | --- |
| [back](https://github.com/MikeTsak/vtm-platform-back) | API, realtime, jobs, Discord bot |
| **front** (this repo) | Player and Storyteller portal |
| [wiki-vtm](https://github.com/MikeTsak/wiki-vtm) | Erebus Wiki at [wiki.attlarp.gr](https://wiki.attlarp.gr) |
| [attlarp.gr](https://github.com/MikeTsak/attlarp.gr) | Public chronicle website |
| [erebus-mobile](https://github.com/MikeTsak/erebus-mobile) | Expo mobile app for SchreckNet and Surface Web |
| [harpy-kindle](https://github.com/MikeTsak/harpy-kindle) | E-ink Harpy terminal for live events |
| [vampire-treasure-hunt](https://github.com/MikeTsak/vampire-treasure-hunt) | Hunt Tracker for location-based challenges |
| [badge-for-larp](https://github.com/MikeTsak/badge-for-larp) | Printable character badge generator |

## License

[GNU GPL v3.0](LICENSE.txt). Copyright (C) 2025 Michail Tsakiroglou.

*Vampire: The Masquerade* is a trademark of Paradox Interactive AB. This is an unofficial fan project for the Athens Through Time chronicle.
