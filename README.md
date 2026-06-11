# Vampire Platform - Frontend

React single-page application serving as the primary interface for players and game masters in the Vampire: The Masquerade V5 LARP platform. Communicates with the Express/MariaDB backend via JWT-authenticated HTTP requests.

## Overview

This frontend provides the main user interface for the Vampire Platform, offering:

- **Character Management**: Create and develop Kindred characters using V5 rules
- **XP Economy**: Earn and spend experience points on attributes, skills, disciplines, and powers
- **Downtime System**: Submit and track player actions between game sessions
- **Domain Management**: Interactive mapping system for tracking territorial control
- **Administrative Console**: Tools for game masters to manage users, characters, NPCs, and game state
- **Mobile Companion Integration**: Works in tandem with the Erebus mobile app for on-the-go access

## Features

### Player Features
- **Authentication**: Secure registration, login, and session persistence
- **Character Creation Wizard**: Step-by-step V5-compliant character creation
- **Character Sheet View**: Detailed view of your Kindred with editable fields
- **XP Shop**: Dynamic cost calculation for XP spends with discipline power selection
- **Downtime Submission**: Format and submit downtime actions for ST review
- **Domain Map**: Leaflet-based interactive map showing domain claims and ownership
- **Coterie Management**: Join or create hunting teams in the Hunt Tracker integration

### Storyteller/Admin Features
- **User Management**: View and manage player accounts
- **Character Oversight**: Edit any character sheet or XP pool
- **NPC Tools**: Create and manage non-player characters with enhanced XP pools
- **Downtime Review**: Approve, reject, or resolve player submissions with GM notes
- **Claims Administration**: Edit domain claims, ownership, and colors
- **XP Tools**: Batch award XP or adjust character statistics
- **Hunt Integration**: Launch and monitor hunting chronicles (separate Hunt Tracker app)

## Technology Stack

- **Framework**: React 18 with functional components and hooks
- **Routing**: React Router 6 for client-side navigation
- **HTTP Client**: Axios instance (`src/api.js`) with automatic JWT token attachment
- **Styling**: CSS Modules for scoped styling + plain CSS for global styles
- **Mapping**: Leaflet via `react-leaflet` for interactive domain maps
- **State Management**: React Context API (`AuthContext.jsx`) for authentication state
- **Build Tool**: Create React App (CRA) with standard configuration

## Getting Started

### Prerequisites
- Node.js 18+ (npm 9+ recommended)
- A running Vampire Platform backend (default expected at `http://localhost:3001`)

### Installation & Development
1. Clone the repository and navigate to the `front/` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (see Configuration section below)
4. Start the development server:
   ```bash
   npm start
   ```
5. The application will be available at `http://localhost:3000` by default

### Production Build
```bash
npm run build
```
Output is written to the `build/` directory, ready for deployment to a static web host.

## Configuration

Create a `.env` file in the repository root:

```env
# Backend API base URL (no trailing slash)
REACT_APP_API_URL=http://localhost:3001/api

# Optional: displayed in the footer (useful to verify deployments)
REACT_APP_VERSION=dev-local

# Optional: Leaflet tiles override (defaults to OpenStreetMap)
# REACT_APP_TILES_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

**Important**: Restart the development server after changing `.env` values.

## Project Structure

```
src/
  api.js               # Axios instance with request/response interceptors for token handling
  App.jsx              # Main application router and navigation structure
  AuthContext.jsx      # React Context for authentication state (token, user data, login/logout)
  pages/               # Page components mapped to routes
    Dashboard.jsx      # Landing page showing character overview and quick actions
    user/
      Login.jsx        # Authentication page (login/register)
      Register.jsx     # User registration form
    CharacterSetup.jsx # Multi-step character creation wizard (V5-compliant)
    CharacterView.jsx  # Detailed character sheet viewer/editor
    DownTimes.jsx      # Downtime submission and history interface
    Admin.jsx          # Main administrative console (protected route)
    Domains.jsx        # Interactive domain claims map interface
  data/                # Static data files
    Domains.json       # GeoJSON FeatureCollection defining domain divisions for the map
    disciplines.js     # Reference data for V5 disciplines, powers, and their descriptions
  components/          # Reusable UI components (buttons, forms, modals, etc.)
  hooks/               # Custom React hooks (if any)
  utils/               # Utility functions (date formatting, validation, etc.)
  styles/              # Global CSS styles and CSS module files
```

## Backend API Expectations

Relative to `REACT_APP_API_URL` (typically `/api`):

### Authentication
- `POST /auth/register` → `{ token }`
- `POST /auth/login` → `{ token }`
- `GET /auth/me` → `{ user }` (requires Authorization header)

### Character Management (Player)
- `GET /characters/me` → `{ character }`
- `POST /characters` → `{ character }` (starts at 50 XP)
- `PUT /characters` → `{ character }`
- `POST /characters/xp/spend` → `{ character, spent }`

### Downtimes (Player)
- `GET /downtimes/quota` → `{ used, limit: 3 }` (per calendar month)
- `GET /downtimes/mine` → `{ downtimes: [...] }`
- `POST /downtimes` → `{ downtime }`

### Domains / Claims
- `GET /domain-claims` → `{ claims: [...] }`

### Admin Endpoints (Require `role: admin`)
- `GET /admin/users`
- `PATCH /admin/users/:id` → `{ user }` (update display_name, email, role)
- `GET /admin/characters`
- `PATCH /admin/characters/:id` → `{ character }`
- `PATCH /admin/characters/:id/xp` → `{ character }` (apply XP delta)
- `GET /admin/downtimes`
- `PATCH /admin/downtimes/:id` → `{ downtime }` (update status, notes, resolution)
- `GET /admin/domain-claims`
- `PATCH /admin/domain-claims/:division` → `{ claim }` (upsert owner_name, color, owner_character_id)
- `DELETE /admin/domain-claims/:division`
- `GET /admin/npcs`
- `POST /admin/admin/npcs` → `{ npc }` (starts at 10,000 XP)
- `GET /admin/npcs/:id`
- `PATCH /admin/npcs/:id` → `{ npc }`
- `DELETE /admin/npcs/:id`
- `POST /admin/npcs/:id/xp/spend` → `{ npc, spent }`

## Integration with Vampire Platform Ecosystem

This frontend works in conjunction with:
- **Backend API** (`back/`) - Provides all data persistence and business logic
- **Hunt Tracker** (`hunt/`) - Separate application for managing hunting chronicles
- **Erebus Mobile** (`erebus-mobile/`) - Companion app for SchreckNet (in-character chat) and Surface Web (email)
- **LARP Badge Generator** (`larp-badges/`) - Tool for creating printable character badges
- **Athens Through Time Website** (`attlarp.gr/`) - Chronicle lore and gallery site

## Troubleshooting

- **403 on Admin Actions**: Verify your user has `role: admin` by checking `/auth/me`
- **CORS Errors**: Ensure the backend is configured to allow requests from your frontend origin
- **Empty Domain Map**: Validate that `src/data/Domains.json` contains valid GeoJSON with numeric `properties.division` values
- **Login Loop**: Clear `localStorage` token and re-authenticate if redirects persist after login
- **API Connection Issues**: Confirm `REACT_APP_API_URL` correctly points to your backend instance

## Development Scripts

- `npm start` - Runs the development server with hot reload
- `npm run build` - Creates production-optimized build in `build/`
- `npm test` - Launches Jest test runner (Create React App default)
- `npm run eject` - **Use with caution**: Removes CRA and exposes build configuration

## Notes

- Authentication tokens are stored in `localStorage` and automatically attached to outgoing requests
- The admin interface is protected by checking the user's role from `/auth/me` on each protected route load
- Character sheets are stored as JSONB in the database, allowing flexible attribute storage per V5 edition
- All monetary values in the XP shop are calculated dynamically based on current and target levels
- Domain map uses Leaflet with OpenStreetMap tiles by default; customize via `REACT_APP_TILES_URL`

## License

Please refer to the LICENSE file in the repository root for licensing information.

## Acknowledgments

- Built for the Vampire: The Masquerade V5 LARP community
- Inspired by the World of Darkness setting created by White Wolf Publishing/Paradox Interactive
- Special thanks to the Athen's Through Time chronicle team for ongoing feedback and testing