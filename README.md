# VTM Platform (V5 LARP) — Frontend

React single‑page application for the **Vampire: The Masquerade V5 LARP** platform.

This repository contains the **frontend only**. It talks to an Express/MariaDB backend over HTTP (JWT auth).

## Features

- Auth: register / login / session restore
- Character creation wizard (V5-style flow)
- Character sheet view + **XP Shop** (auto-calculated costs, discipline power selection)
- Downtimes: player submission + admin review / resolution
- Domains: Leaflet map view for claims; admin tooling to edit claims & colors
- Admin console: users, characters, claims, downtimes, XP tools, **NPCs**

## Tech stack

- React 18
- React Router 6
- Axios (via `src/api.js`) with `Authorization: Bearer <token>`
- CSS Modules + plain CSS
- Leaflet (`react-leaflet`)

## Getting started

### Prerequisites

- Node.js 18+ (npm 9+ recommended)
- A running backend (default expected at `http://localhost:3001`)

### Install & run (development)

```bash
npm install
npm start
```

App runs at `http://localhost:3000` by default.

### Build (production)

```bash
npm run build
```

Output is written to `build/`.

## Configuration (.env)

Create a `.env` file in the repo root:

```env
# Backend API base URL (no trailing slash)
REACT_APP_API_URL=http://localhost:3001/api

# Optional: displayed in the footer (useful to verify deployments)
REACT_APP_VERSION=dev-local

# Optional: Leaflet tiles override
# REACT_APP_TILES_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

After changing `.env`, restart the dev server.

## High-level structure

```
src/
  api.js               # axios instance + token attach
  App.jsx              # routes + nav
  AuthContext.jsx      # auth state + localStorage
  pages/
    Dashboard.jsx
    user/Login.jsx
    user/Register.jsx
    CharacterSetup.jsx
    CharacterView.jsx
    DownTimes.jsx
    Admin.jsx
    Domains.jsx
  data/
    Domains.json       # GeoJSON FeatureCollection (numeric properties.division)
    disciplines.js     # discipline metadata
```

## Backend API expectations (summary)

Relative to `REACT_APP_API_URL` (e.g. `/api`):

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /characters/me`, `POST /characters`, `PUT /characters`, `POST /characters/xp/spend`
- `GET /downtimes/quota`, `GET /downtimes/mine`, `POST /downtimes`
- Admin: users, downtimes, characters, claims, NPCs (see code for exact routes)

If you rename backend routes, update the corresponding calls in this repo.

## Troubleshooting

- **403 on admin actions**: user isn’t `admin` (check `/auth/me`)
- **CORS errors**: backend must allow the frontend origin
- **Domains map empty**: validate `src/data/Domains.json` is correct GeoJSON
- **Login succeeds but you’re redirected**: clear localStorage token and re-login

## Scripts

- `npm start` — dev server
- `npm run build` — production build
- `npm test` — tests (CRA)
