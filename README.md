# Vampire V5 LARP — Frontend

A React SPA for your Vampire: The Masquerade V5 LARP platform. It pairs with the Express/MariaDB backend and provides:

* Authentication (register/login)
* Character creation wizard (V5-ish rules)
* Character view + **XP Shop** (auto-costs, discipline power selection modal)
* Downtimes (player submission; admin review/approval/resolution)
* Domains map (players see claims; admins edit claims & colors)
* Admin console (users, characters, claims, downtimes, XP tools, **NPCs**)
* NPC tools (create via the same CharacterSetup, view with CharacterView; start with 10,000 XP)

> This README only covers the **frontend**. For the backend, use the backend README you generated earlier.

---

## 1) Tech Stack

* React 18 + React Router 6
* Axios wrapper (`src/api.js`) for API calls with JWT
* CSS Modules (e.g., `Admin.module.css`), plus a few plain CSS files
* Leaflet for the Domains map (`react-leaflet` + `leaflet`)
* LocalStorage for token persistence (see `src/AuthContext.jsx`)

---

## 2) Quickstart

### Prereqs

* Node.js 18+ and npm 9+
* Backend running locally on [http://localhost:3001](http://localhost:3001) (or your own URL).

### Setup & Run (Dev)

```bash
# from the frontend folder
npm install
# configure .env (see below)
npm start
```

This runs at [http://localhost:3000](http://localhost:3000) by default.

### Build (Prod)

```bash
npm run build
```

Build output goes to `build/`.

---

## 3) Environment Variables

Create `./.env` in the **frontend** root with **at least**:

```env
# Backend API base (no trailing slash)
REACT_APP_API_URL=http://localhost:3001/api

# Optional: a version string shown in the footer (helps with cache busting awareness)
REACT_APP_VERSION=dev-local

# Optional: Leaflet tile server override
# REACT_APP_TILES_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

> The app reads `REACT_APP_API_URL` in `src/api.js`. If the backend URL changes, edit this value and restart the dev server.

---

## 4) Project Structure (high level)

```
src/
  api.js                  # axios instance (+ token attach)
  App.jsx                 # routes & nav
  AuthContext.jsx         # login state, token, logout
  index.js                # CRA entry; service worker is NOT registered
  components/
    Footer.jsx            # shows version and quick info
  pages/
    Dashboard.jsx         # home for logged-in users
    user/
      Login.jsx
      Register.jsx
    CharacterSetup.jsx    # multi-step creation wizard
    CharacterView.jsx     # XP shop, discipline power selection
    DownTimes.jsx         # player downtime UI
    Admin.jsx             # admin console (users / characters / claims / downtimes / XP / NPCs)
    Domains.jsx           # player-readable Domains map + list
  styles/
    Admin.module.css
    CharacterView.module.css
    *.css
  data/
    Domains.json          # GeoJSON FeatureCollection with numeric `properties.division`
    disciplines.js        # Discipline metadata (icons, levels, placeholder info)
  img/
    clans/...             # clan symbols & text logos used by CharacterSetup
    disciplines/...       # e.g., Auspex-rombo.png etc.
```

---

## 5) Routing / Pages

* `/login`, `/register` – authentication forms.
* `/` (Dashboard) – shows quick links (View Character, Domains, Downtimes, Communications placeholder).
* `/admin` – admin-only console with tabs:

  * **Users** (edit name/email/role)
  * **Characters** (edit name/clan/sheet JSON; view XP)
  * **Claims** (interactive map + list; create/edit/delete claims; color picker)
  * **Downtimes** (search, change status, add **GM Resolution** and **GM Notes**)
  * **XP Tools** (bulk grant/subtract XP per character)
  * **NPCs** (list, create via CharacterSetup, view via CharacterView)
* Domains (player view) – read-only map of claims + below-the-map listing.

> Admin access is based on the token’s `role` (`admin` vs `user`). If you see 403s on admin endpoints, your user is not an admin.

---

## 6) Character Creation & View

* **CharacterSetup**: multi-step wizard (Clan → Identity → Predator & Disciplines → Attributes → Skills → Advantages → Morality → Review).

  * On save: calls `POST /api/characters` (backend) with `sheet` JSON.
  * Starts each player character with **50 XP** (by backend rule).
* **CharacterView** (XP Shop):

  * Calculates costs according to your table:

    * Attribute: new×5
    * Skill: new×3
    * Specialty: 3
    * Clan Discipline: new×5
    * Other Discipline: new×7
    * Caitiff Discipline: new×6
    * Blood Sorcery Ritual: level×3
    * Thin-blood Formula: level×3
    * Advantage: 3 per dot
    * Blood Potency: new×10
  * **Discipline Power Selection**: when increasing dots, a modal forces choosing the specific power for the new dot. Assigning the power to an **existing** dot is **free** (no extra XP).
  * Shows your current XP and success/failure messages from the server.

---

## 7) Downtimes

* **Players** can submit up to **3 per calendar month** (server-enforced).
* Feeding type auto-suggested from predator type if blank.
* **Admins** can search, set status (`submitted`, `approved`, `rejected`, `resolved`), and fill **GM Resolution** and **GM Notes**.

---

## 8) Domains (Map & Claims)

* Player **Domains.jsx** is read-only: shows Leaflet map colored by claims + list of all divisions with owner names.
* Admin **Claims tab** inside Admin console:

  * Left: map + list (search/filter/sort).
  * Right: editor for selected claim or new claim.
  * Can set **Owner Name**, optional **Owner Character**, and a **color** (with a native `<input type="color">` + hex input).
* Map data lives in `src/data/Domains.json` (must be a `FeatureCollection` with numeric `properties.division`).

---

## 9) NPCs (Admin)

* Admins can create NPCs via the same **CharacterSetup** (passes `forNPC` to backend).
* NPCs start with **10,000 XP** (backend logic).
* Admins can view an NPC using **CharacterView** (wired to admin NPC endpoints).
* All admins can see/edit NPCs.

---

## 10) Auth & Token Storage

* On login/register, the backend returns a JWT.
* The token is saved in `localStorage` and attached as `Authorization: Bearer <token>` by `src/api.js` for all requests.
* Logout clears the token and user state.

---

## 11) Caching & “Instant Updates”

* **No Service Worker** is registered (CRA default SW is not used). See `src/index.js` — nothing to unregister.
* During development, you can force faster updates by:

  * Hard refresh (Ctrl+F5) or clear site data in DevTools.
  * “Disable cache” in DevTools Network tab (only while DevTools is open).
* For production:

  * Each deploy changes asset filenames (content-hashed), so browsers fetch new files.
  * Optionally set `REACT_APP_VERSION` and show it in the footer for sanity checks.
  * If you still see stale content, verify your host/CDN isn’t caching `index.html` too aggressively.

---

## 12) Expected Backend Endpoints

The frontend expects (paths relative to `REACT_APP_API_URL`, e.g., `/api`):

* **Auth**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
* **Characters**: `GET /characters/me`, `POST /characters`, `PUT /characters`, `POST /characters/xp/spend`
* **Downtimes**: `GET /downtimes/quota`, `GET /downtimes/mine`, `POST /downtimes`
* **Admin**:

  * Users: `GET /admin/users`, `PATCH /admin/users/:id` (optional)
  * Characters: `PATCH /admin/characters/:id`, `PATCH /admin/characters/:id/xp`
  * Downtimes: `GET /admin/downtimes`, `PATCH /admin/downtimes/:id`
  * Claims: `GET /domain-claims`, `PATCH /admin/domain-claims/:division`, `DELETE /admin/domain-claims/:division`
  * NPCs: `GET /admin/npcs`, `POST /admin/npcs`, `GET /admin/npcs/:id`, `PATCH /admin/npcs/:id`, `DELETE /admin/npcs/:id`, `POST /admin/npcs/:id/xp/spend`

> If you alter endpoint names, adjust `api` calls in the components accordingly.

---

## 13) Troubleshooting

* **403 Forbidden** on admin actions → the logged-in user is not an admin (check `/auth/me` or re-login).
* **CORS error** → backend must allow the frontend origin (`app.use(cors({ origin: true, credentials: true }))` is fine for local dev).
* **“You have not selected a specific power”** → the modal requires an explicit discipline power selection for each new dot.
* **Domains map empty** → ensure `src/data/Domains.json` is a valid GeoJSON FeatureCollection with numeric `properties.division`.
* **Login succeeds but still redirected** → clear localStorage token and try again; ensure `REACT_APP_API_URL` is correct.

---

## 14) Scripts

```jsonc
// package.json (relevant)
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

If you use Vite or another bundler later, adapt the commands accordingly.

---

## 15) Notes for Maintainers

* Discipline metadata lives in `src/data/disciplines.js`. You can keep filling in real data; placeholders are fine for now.
* Clan assets are read from `public/img/clans/...`. Discipline icons are in `public/img/disciplines/...` (e.g., `Auspex-rombo.png`). Ensure correct paths.
* **Admin.jsx** is large but segmented into tabs. If it grows further, consider splitting tabs into separate files under `src/pages/admin/`.
* Keep backend and frontend versions in sync. When you add or rename endpoints on the backend, grep this repo for the path and update calls.
