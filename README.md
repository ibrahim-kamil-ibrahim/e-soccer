# E-Soccer — Your Home of Ethiopian Football

> A full-stack football platform covering the Ethiopian football landscape, focused on the Dire Dawa region. React SPA + Express API + Prisma/PostgreSQL, with a role-based admin panel.

Public pages fetch all data live from the API. Admins manage teams, players, matches, news, competitions, cities, media, users, and site settings through a protected console.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication & Security](#authentication--security)
- [API Overview](#api-overview)
- [Database (Prisma → PostgreSQL)](#database-prisma--postgresql)
- [Admin Panel](#admin-panel)
- [Public Routing Map](#public-routing-map)
- [Features](#features)
- [Design System](#design-system)
- [Testing](#testing)
- [CI](#ci)
- [Scripts Reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Project Overview

E-Soccer is a full-stack web application for Ethiopian football. It consists of:

- **Public SPA** — a React single-page application that displays matches, teams, players, news, and competitions
- **REST API** — an Express backend that serves all data, handles authentication, file uploads, Excel import/export, and admin operations
- **Admin Panel** — a protected React console (mounted at `/admin/*`) for managing all content
- **PostgreSQL database** — accessed via Prisma ORM with 16 models and 7 enums

The app uses cookie-based JWT authentication with role-based access control (`SUPER_ADMIN`, `ADMIN`, `EDITOR`), double-submit CSRF protection, Helmet security headers, request-body sanitization, and rate limiting.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend framework | **React 19** |
| Routing | **React Router DOM 7** |
| Build tool | **Vite 8** |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`, `@theme` tokens) |
| Icons | **Lucide React** |
| Linting | **oxlint** |
| Backend framework | **Express 4** |
| ORM | **Prisma 6** (PostgreSQL) |
| Auth | **JWT** (`jsonwebtoken`, httpOnly cookie + Bearer) + **bcryptjs** |
| CSRF | **csrf-csrf** (double-submit cookie, `GET /api/csrf-token`) |
| Validation | **express-validator** (422 on failure) |
| Security headers | **helmet** |
| Rate limiting | **express-rate-limit** (global: 1000 / 15 min; auth: 100 / 15 min) |
| Sanitization | **dompurify** (`sanitizeObject` middleware on `req.body`) |
| File uploads | **multer** (disk storage, 5 MB, jpeg/png/webp/gif/svg) |
| Excel import/export | **exceljs** |
| API docs | **swagger-jsdoc** + **swagger-ui-express** (`/api/docs`) |
| HTTP logging | **morgan** (dev only) |
| Testing | **vitest** + **supertest** (backend) / **@testing-library/react** (frontend) |
| Language | JavaScript (ES modules, `"type": "module"`) |

---

## Project Structure

```
e/
├── .github/workflows/ci.yml # GitHub Actions CI (backend + frontend jobs)
├── backend/                 # Express + Prisma API (port 5000)
│   ├── prisma/
│   │   ├── schema.prisma    # 16 models, 7 enums
│   │   ├── data/            # seed datasets (competitions, teams, players, matches, news)
│   │   └── seed.js          # Idempotent seed — data + admin users + settings
│   ├── src/
│   │   ├── config/          # env.js, prisma.js, swagger.js
│   │   ├── controllers/     # 11 controllers (auth, team, player, match, bracket, ...)
│   │   ├── middleware/      # auth (JWT), errorHandler, rateLimit, sanitize, validate
│   │   ├── routes/          # 12 route files mounted at /api/*
│   │   ├── services/        # helpers, standings, bracket, excel (export/import/templates/validators)
│   │   ├── app.js           # Express app — helmet, CORS, CSRF, sanitize, routes, static /uploads
│   │   └── server.js        # Entry — listens on PORT (default 5000)
│   ├── tests/               # 7 vitest suites (unit + supertest integration)
│   ├── uploads/             # uploaded files (served at /uploads with sandbox CSP)
│   ├── .env / .env.example
│   └── package.json
│
├── frontend/                # React 19 + Vite 8 SPA (port 9999)
│   ├── public/              # logo.png, bg.png, favicon.svg, icons.svg
│   ├── src/
│   │   ├── pages/           # 14 public pages (Home, Matches, Teams, ...)
│   │   ├── admin/
│   │   │   ├── components/  # DataTable, Modal, ConfirmDialog, ui, Toast, ExcelActions, ...
│   │   │   ├── contexts/    # AuthContext, ThemeContext
│   │   │   ├── layouts/     # AdminLayout (sidebar + topbar)
│   │   │   └── pages/       # 20 admin page files (Dashboard, MatchForm, MatchControlModal, ...)
│   │   ├── services/        # 12 API service modules (api.js + entity services)
│   │   ├── components/      # common/ (Cards, SearchOverlay, LoadingSkeletons, ErrorBoundary), layout/ (Header)
│   │   ├── data/            # (empty — placeholder)
│   │   ├── hooks/           # (empty — placeholder)
│   │   ├── test/            # setup.js (vitest + jsdom setup)
│   │   ├── utils/           # helpers.js + helpers.test.js (formatters, useLocalStorage)
│   │   ├── App.jsx          # Routes: public + /admin/*
│   │   ├── main.jsx
│   │   └── index.css        # Design system (Tailwind v4 @theme)
│   ├── vite.config.js       # port 9999, proxies /api + /uploads → :5000
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js (recent LTS; CI uses Node 20)
- PostgreSQL running locally (default DB `esoccer`)

### 1. Backend

```bash
cd backend
npm install                 # runs postinstall → prisma generate
cp .env.example .env        # then edit DATABASE_URL / secrets
npm run db:push             # sync schema (no migrations dir)
npm run seed                # optional — idempotent seed (demo data + admin users)
npm run dev                 # node --watch src/server.js → :5000
npm test                    # vitest — unit + API integration tests (uses DATABASE_URL)
```

Health check: `GET http://localhost:5000/api/health` →
`{ "success": true, "message": "E-Soccer API is running" }`

Interactive API docs: `http://localhost:5000/api/docs` (Swagger UI, spec at `/api/docs.json`).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # Vite → http://localhost:9999
npm test                    # vitest — helper + component tests (jsdom)
```

The dev server proxies `/api` and `/uploads` to `http://localhost:5000` (see `vite.config.js`).

### 3. Production Build

```bash
cd frontend
npm run build               # output → frontend/dist/
npm run preview             # local preview of the build
```

Backend production: `cd backend && npm start` (`NODE_ENV=production` requires `JWT_SECRET` and refuses to seed without `SEED_ADMIN_PASSWORD`).

---

## Environment Variables (`backend/.env`)

```bash
DATABASE_URL="postgresql://postgres:***@localhost:5432/esoccer?schema=public"
PORT=5000
CLIENT_URL=http://localhost:9999
JWT_SECRET=change-me-to-a-long-random-secret
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads
# Password for accounts created by `npm run seed` (required when NODE_ENV=production)
SEED_ADMIN_PASSWORD=
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Backend listen port (default 5000) |
| `CLIENT_URL` | Allowed CORS origin (frontend URL) |
| `JWT_SECRET` | Secret for signing JWT tokens (required in production) |
| `JWT_EXPIRES_IN` | Token expiry (default `7d`; supports `s`/`m`/`h`/`d` suffixes) |
| `UPLOAD_DIR` | Directory for uploaded files (resolved relative to backend root, default `uploads`) |
| `SEED_ADMIN_PASSWORD` | Password for all seeded admin accounts; **required** when `NODE_ENV=production` |
| `NODE_ENV` | `production` enables secure cookies, `sameSite=none`, `__Host-` CSRF cookie name; dev fallback JWT secret is used otherwise |

---

## Authentication & Security

- **Login:** `POST /api/auth/login` with email **or** username + password. Returns a JWT **and** sets an httpOnly `token` cookie.
- **Token verification:** `requireAuth` reads the httpOnly cookie or `Authorization: Bearer` header; `requireRole(...roles)` enforces RBAC. `optionalAuth` attaches the user when a valid token is present without blocking public routes.
- **CSRF:** double-submit cookie via `csrf-csrf`. All non-`GET` `/api/*` requests require the CSRF token; clients fetch it from `GET /api/csrf-token`. The cookie name is `psifi.x-csrf-token` in dev and `__Host-psifi.x-csrf-token` in production.
- **Body sanitization:** every JSON body is recursively sanitized with DOMPurify (`sanitizeObject`) before reaching controllers.
- **Security headers:** Helmet is enabled globally. Uploaded files are served from `/uploads` with a restrictive sandbox CSP (`default-src 'none'; sandbox`) and `X-Content-Type-Options: nosniff`, so stored SVGs can never execute script in the API origin.
- **Rate limiting:** global API limiter at 1000 requests / 15 min; auth routes additionally limited to 100 requests / 15 min. Per-account lockout after 5 failed login attempts (15 min, DB-backed on `admin_users.failedLoginAttempts` / `lockedUntil`).
- **Roles** (`Role` enum): `SUPER_ADMIN`, `ADMIN`, `EDITOR`.
  - Writes (create/update): SUPER_ADMIN / ADMIN / EDITOR
  - Deletes: SUPER_ADMIN / ADMIN
  - Excel import/export: SUPER_ADMIN / ADMIN (news also allows EDITOR)
  - User management: SUPER_ADMIN (list/get also ADMIN)
- **Seed logins:** `npm run seed` creates 4 admin accounts — `esoccer170@gmail.com` (SUPER_ADMIN), `admin@esoccer.et` (SUPER_ADMIN), `editor@esoccer.et` (EDITOR), `ibro@esoccer.et` (SUPER_ADMIN). All share the password from `SEED_ADMIN_PASSWORD`; when unset in development the seed falls back to a dev-only password defined in `prisma/seed.js` (production seeding without `SEED_ADMIN_PASSWORD` is refused).

---

## API Overview

All endpoints are mounted under `/api`. List endpoints return `{ success, items, pagination }`; single-resource endpoints return `{ success, <entity> }`. Errors return `{ success: false, message }` with the appropriate status code (validation failures use 422).

Interactive docs: **`GET /api/docs`** (Swagger UI, generated from `@openapi` JSDoc comments) · spec at **`GET /api/docs.json`**.

| Route file | Base path | Highlights |
|------------|-----------|------------|
| `auth.js` | `/api/auth` | login, logout, me, update profile (rate-limited) |
| `teams.js` | `/api/teams` | CRUD, bulk delete, auto-slug, export/template/import |
| `players.js` | `/api/players` | CRUD, bulk delete, auto-slug + auto-age, export/template/import |
| `matches.js` | `/api/matches` | CRUD, bulk delete, per-match standings, export/template/import |
| `competitions.js` | `/api/competitions` | CRUD, bulk delete, standings, **bracket generate/read**, export/template/import |
| `news.js` | `/api/news` | CRUD, bulk delete, slug lookup, export/template/import |
| `cities.js` | `/api/cities` | CRUD, bulk delete, `/hierarchy`, `/subcities`, `/woredas`, `/kebeles`, `/all`, export/template/import |
| `media.js` | `/api/media` | upload (multipart), delete, bulk delete, export/template/import |
| `users.js` | `/api/users` | admin user CRUD, bulk delete, export/template/import (SUPER_ADMIN) |
| `settings.js` | `/api/settings` | website settings + homepage settings (`/homepage`) |
| `dashboard.js` | `/api/dashboard` | `/stats`, `/recent-matches`, `/live-matches`, `/standings/:competitionId`, `/top-scorers` |
| `activity.js` | `/api/activity` | paginated activity log (SUPER_ADMIN / ADMIN) |

Plus infrastructure endpoints: `GET /api/health`, `GET /api/csrf-token`, and static `GET /uploads/*`.

---

## Database (Prisma → PostgreSQL)

**16 models:** `AdminUser`, `Competition`, `Season`, `City`, `Team`, `Player`, `Match`, `MatchEvent`, `MatchLineup`, `MatchStatistic`, `NewsArticle`, `Media`, `WebsiteSetting`, `HomepageSetting`, `Favorite`, `ActivityLog`

**7 enums:** `Role`, `UserStatus`, `PublicationStatus`, `MatchStatus`, `EventType`, `Side`, `MediaCategory`

Schema workflow is **`prisma db push`** (no `migrations/` directory). Run `npm run prisma:generate` after schema changes (also runs on `postinstall`).

### Match Schema

The `Match` model includes:
- `competitionId` → FK to `Competition` (nullable)
- `homeTeamId`, `awayTeamId` → FK to `Team` (required)
- `homeScore`, `awayScore` → Int (nullable)
- `status` → `MatchStatus` enum: `SCHEDULED`, `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED`
- Display labels stay branded: `SCHEDULED` renders as **UPCOMING**, `FINISHED` as **FT**; legacy `UPCOMING`/`FT` values are accepted as aliases on seed/import and normalized to the enum
- `date` (DateTime), `timeField` (mapped to `time` column), `venue`, `round`, `notes`
- `isLive`, `isFinished` (Boolean, derived from status)
- Relations: `MatchEvent`, `MatchLineup`, `MatchStatistic` (cascade delete)

### Competition Schema

Includes `bracketSeeds` (Json) used by the knockout bracket generator (`bracketController`): `POST /api/competitions/:id/bracket` accepts `{ teamIds: [...] }` and stores the seeded bracket; `GET /api/competitions/:id/bracket` reads it back.

### Ethiopian Administrative Hierarchy (City model)

`Region → City → Sub-city → Woreda → Kebele`, with `cityType` (Regional City / Zone City / Chartered City / Town) and optional lat/lng, logo, description. 14 regions are supported in the admin UI.

---

## Admin Panel

Protected under `/admin/*` (`ProtectedRoute` → login redirect; wrong role → dashboard). Built with `AdminLayout` (sidebar + topbar), `AuthContext` for session state, and `ToastProvider` for notifications.

### Layout & Navigation

- **Sidebar** (desktop, 240px): logo, nav items with active highlighting (green background + icon), user card with role label, Logout button
- **Topbar**: "E-Soccer Management Console" label, theme toggle (light/dark via localStorage `es-admin-theme`), "View Website" link
- **Mobile**: hamburger button opens full-width drawer sidebar with backdrop overlay
- **Nav items**: Dashboard, Matches, Competitions, Teams, Cities, Players, News, Media, Activity, Users, Settings
- **Role-based visibility**: Users, Activity, and Settings are wrapped in `ProtectedRoute roles={["SUPER_ADMIN", "ADMIN"]}`

### Login Page

- Standalone page (no admin layout) with theme toggle
- Email/username + password fields with icons
- Demo credentials removed from UI
- Redirects to `/admin/dashboard` on success, shows error toast on failure
- Per-account lockout: 5 failed attempts → 15-minute lockout (429 response)

### Dashboard

- **Stats cards**: Total Matches, Live Matches, Total Teams, Players, Competitions, News Articles (plus Media, Users, and pending News from `/api/dashboard/stats`)
- **Recent Matches** table with competition, teams, score, status, date (`/api/dashboard/recent-matches`)
- **Live Matches** grid with pulsing indicator (`/api/dashboard/live-matches`)
- **Quick Actions** grid: Add Match, Team, Player, Competition (link to create forms)
- **Recent Activity** list from the dashboard endpoint
- Loading skeleton with 6 placeholder cards

### Admin Routes

| Path | Page | Description |
|------|------|-------------|
| `/admin/login` | Login | Standalone login (no layout) |
| `/admin/dashboard` | Dashboard | Stats, recent/live matches, quick actions, activity |
| `/admin/matches` | AdminMatches | Table with filters (search, competition, status, date, team), bulk delete, Excel actions, live match control modal |
| `/admin/matches/create` | MatchForm | Tabbed create form (Basic, Events, Lineups, Statistics) with validation |
| `/admin/matches/:id/edit` | MatchForm | Same tabbed form in edit mode, prefilled from the match |
| `/admin/competitions` | AdminCompetitions | Table with search, region/type filters, bulk delete, Excel actions |
| `/admin/competitions/create` | CompetitionForm | Create form (name, season, level, type, logo, color, status, sort order) |
| `/admin/competitions/:id/edit` | CompetitionForm | Edit form with same fields |
| `/admin/teams` | AdminTeams | Table with search, competition/division/city filters, bulk delete, Excel actions |
| `/admin/teams/create` | TeamForm | Basic team form (name, short name, logo, city, description) |
| `/admin/teams/:id/edit` | TeamForm | Edit + management controls (status, published, featured, order, slug) |
| `/admin/cities` | Cities | 4-step wizard (Basic, Hierarchy, Details, Settings) with suggestion chips |
| `/admin/players` | AdminPlayers | Table with search, team/position filters, photo display, bulk delete, Excel actions |
| `/admin/players/create` | PlayerForm | 5-step wizard (Basic, Football, Additional, Stats, Settings) |
| `/admin/players/:id` | PlayerDetail | Photo, personal info, stats, position/team, biography, social |
| `/admin/players/:id/edit` | PlayerForm | Same wizard for editing |
| `/admin/news` | AdminNews | Table with search, status filter, bulk delete, Excel actions |
| `/admin/news/create` | NewsForm | Title, slug, summary, content, category, author, cover image, publish toggle |
| `/admin/news/:id/edit` | NewsForm | Same form for editing |
| `/admin/media` | Media | Grid with preview, category filter, upload, copy URL, bulk delete, Excel actions |
| `/admin/users` | Users | Table with role badges, modal form for add/edit, self-delete prevention (SUPER_ADMIN/ADMIN) |
| `/admin/settings` | Settings | Website settings form (SUPER_ADMIN/ADMIN) |
| `/admin/activity` | Activity | Paginated log with action badges (create/update/delete/login/publish/unpublish) (SUPER_ADMIN/ADMIN) |
| `/admin/profile` | Profile | User info, notification preferences (persisted to DB) |
| `*` (inside `/admin`) | — | Redirects to `/admin/dashboard` |

### Shared Admin Components

| Component | Purpose |
|-----------|---------|
| `DataTable` | Reusable table with pagination, sorting, selectable rows, checkbox, search input, filter select |
| `Modal` | Overlay dialog with backdrop, title, footer actions |
| `ConfirmDialog` | Destructive action confirmation with loading state |
| `Toast` | Success/error notifications (auto-dismiss 4s, bottom-right) |
| `Spinner` | Inline loading indicator |
| `ui.jsx` | `Field`, `TextInput`, `TextArea`, `Select`, `Checkbox`, `Button` (variants: primary/danger/ghost/outline; sizes: sm/md/lg), `Badge`, `PageHeader`, `Spinner` |
| `ProtectedRoute` | Auth guard — redirects to login if not authenticated, checks role permissions |
| `ExcelActions` | Import/export buttons with dropdown |
| `ExcelImportModal` | Drag & drop Excel upload, validation, error report download |

### User Management

- Table with name/email avatar, role badges (SUPER_ADMIN/EDITOR), status, last login, created date
- Add/Edit modal form: name, email, password (min 8 chars), role, status
- Self-delete prevention (cannot delete own account)
- Role selector: only SUPER_ADMIN can create/edit SUPER_ADMIN users
- Bulk delete with confirmation

### Activity Log

- Paginated table of admin actions
- Action types with icons: create (green pencil), update (slate pencil), delete (red trash), login (blue shield), publish (green eye), unpublish (yellow eye)
- User avatar + username, timestamp with locale formatting
- Requires SUPER_ADMIN or ADMIN role

### Create Match Form

Single-page form (no tabs) with:
- **Competition** (dropdown, published only) — auto-loads season
- **Home Team / Away Team** (dropdowns, must differ)
- **Match Date & Time** (datetime picker)
- **Status**: `SCHEDULED` (default), `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED`
- **Scores**: shown when `FINISHED` (required) or `LIVE` (optional)
- **Venue, Round/Matchday, Notes** (textarea, 300 char max with counter)
- Inline validation, disabled submit during save

### Profile Page

- Displays real user data from auth context (name, email, role, member since)
- Notification preferences persisted to database (`AdminUser.preferences` JSON)
- Loading skeleton, error handling

### Team Form (MVP Two-Form Structure)

- **Create** → **Basic Team Form** only (5 inputs): Team Name*, Short Name*, Team Logo, City*, Description → Create
- **Edit** → **Basic Form + Team Management** (5 admin controls): Status (Active / Inactive / Archived), Published toggle, Featured Team toggle, Display Order, auto-generated Slug → Save Changes
- **Delete** → inline confirmation → Delete

### Player Form (5-Step Wizard)

1. **Basic Information** — photo upload (drag & drop, JPEG/PNG/WebP up to 3MB), full name, date of birth, nationality, region/city
2. **Football Info** — team, position, jersey number, preferred foot, player status
3. **Additional & Stats** — height, weight, Instagram, biography
4. **Statistics** — matches, goals, assists, yellow/red cards
5. **Settings** — publish status (Active / Inactive / Archived), Featured Player toggle

Step validation: name required (step 1), team required (step 2). Steps can be navigated via the step indicator or Back/Next buttons.

---

## Public Routing Map

| Path | Page | Notes |
|------|------|-------|
| `/` | `Home` | Featured-match hero, live matches, standings, news |
| `/matches` | `Matches` | Tabbed: All / Live / Upcoming / Finished |
| `/match/:id` | `MatchCenter` | Overview, Lineups, Events, Statistics, Table |
| `/competitions` | `Competitions` | Filterable grid |
| `/competitions/:id` | `CompetitionDetails` | Tabs + standings from real results |
| `/teams` | `Teams` | Filterable grid + form guide |
| `/teams/:id` | `TeamDetails` | Logo, jerseys, social, matches, squad |
| `/players` | `Players` | Filterable grid (loads all pages of the API list, ordered by name) |
| `/players/:id` | `PlayerProfile` | Overview, Statistics, Matches |
| `/news` | `News` | Filterable grid |
| `/news/:id` | `NewsArticle` | Full article |
| `/search` | `SearchPage` | Delegates to global search overlay |
| `/favorites` | `Favorites` | Persisted in `localStorage` (`es-favorites`) |
| `*` | `NotFound` | 404 fallback |

---

## Features

### Public Site

- **Home** — featured-match hero (FEATURED MATCH badge), live-now indicator, today's fixtures, top competitions, featured teams, standings table (API-driven), top scorers, latest news
- **Matches** — tabbed views, date navigation, competition + team filters, status badges
- **Match Center** — full header, five tabs (Overview / Lineups / Events / Statistics / Table)
- **Competitions** — search + region filter, detail pages with standings computed from real match results
- **Teams** — search + competition filter, form guide, detail pages with logo/jerseys/contact/social
- **Players** — search + position/team filters, profile pages with photo display, statistics, match history
- **News** — search + category filter, article pages
- **Global search** — header modal with debounced API search across Teams, Players, Competitions, News
- **Favorites** — localStorage persistence
- **Responsive** — desktop nav + mobile hamburger/bottom tab bar

### Admin Console

- JWT-protected, role-based (SUPER_ADMIN / ADMIN / EDITOR)
- Full CRUD for teams, players, matches, news, competitions, cities, media, users
- Multi-step wizard forms with file uploads (Team, Player, City)
- Ethiopian hierarchy (Region → City → Sub-city → Woreda → Kebele) with suggestion chips
- Team: Basic form (create) + Team Management controls (edit)
- Player: 5-step wizard with photo upload, stats, and publish settings
- Match: Single-page create form with validation + tabbed edit form with events/lineups/stats + live match control modal
- **Excel import/export for all major entities** (Teams, Players, Matches, Competitions, News, Cities, Media, Users) — template download, bulk upload, data export
- Knockout bracket generation per competition (stored as `bracketSeeds`)
- Standings and top scorers computed server-side from real results
- Activity log for create/update/delete/login/publish actions
- Dashboard with stats, standings, top scorers
- User profile with persisted notification preferences
- **Bulk delete** on all list pages (Matches, Competitions, Teams, Cities, Players, News, Media, Users) — checkbox selection + single confirmation dialog
- **Excel import modal** — download template, upload filled template, preview and import
- **Per-account lockout** — 5 failed login attempts locks account for 15 minutes
- **File upload security** — extension + MIME type validation (jpeg/png/webp/gif/svg only), 5 MB cap, sandbox CSP on `/uploads`

---

## Design System

- **Theme:** light / white + football green (`#16A34A`); surfaces `#FFFFFF`, text `#1E293B`, borders `rgba(0,0,0,0.08)`
- **Status colors:** red `#EF4444` (LIVE / destructive), gold `#F59E0B` (warnings)
- **Typography:** **Chakra Petch** (display/headings) + **Inter** (body), loaded via Google Fonts and `@theme` tokens
- **Admin theme toggle** exists in the topbar (localStorage `es-admin-theme`); public site is fixed light

---

## Testing

| Suite | Runner | Files |
|-------|--------|-------|
| Backend | `vitest` + `supertest` | `api.integration.test.js`, `bracket.test.js`, `excelImport.test.js`, `helpers.test.js`, `matchController.test.js`, `standings.test.js`, `statusHelpers.test.js` |
| Frontend | `vitest` + `@testing-library/react` (jsdom) | `utils/helpers.test.js`, `components/common/SearchOverlay.test.jsx` |

Run with `npm test` in either `backend/` or `frontend/`. Backend integration tests require a reachable `DATABASE_URL`.

---

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs on pushes/PRs to `main`:

- **Backend job** — Ubuntu, PostgreSQL 16 service container (`esoccer_test`), Node 20, `npm ci`, Prisma generate, then the test suite.
- **Frontend job** — Node 20, `npm ci`, lint (`oxlint`) and tests.

---

## Scripts Reference

| Where | Script | Command |
|-------|--------|---------|
| backend | `dev` | `node --watch src/server.js` |
| backend | `start` | `node src/server.js` |
| backend | `test` | `vitest run` (unit + supertest integration) |
| backend | `test:watch` | `vitest` |
| backend | `test:coverage` | `vitest run --coverage` |
| backend | `db:push` | `prisma db push` |
| backend | `seed` | `prisma db seed` → `node prisma/seed.js` (idempotent) |
| backend | `prisma:generate` | `prisma generate` |
| backend | `prisma:migrate` | `prisma migrate dev` |
| frontend | `dev` | `vite` |
| frontend | `build` | `vite build` |
| frontend | `preview` | `vite preview` |
| frontend | `lint` | `oxlint` |
| frontend | `test` | `vitest run` (jsdom + Testing Library) |

---

## Troubleshooting

- **`EADDRINUSE` on :5000** — another Node process holds the port. Find it: `netstat -ano | findstr :5000`, then `taskkill /PID <pid> /F`. The server also prints a clean diagnostic on this error.
- **Prisma client out of sync** — run `npm run prisma:generate` in `backend/`.
- **Permission/EPERM during `prisma generate`** — kill running Node processes first (`taskkill /F /IM node.exe` on Windows).
- **Vite proxy ECONNRESET** — the dev server proxies `/api` to the backend; ensure the backend is running on port 5000 before starting the frontend.
- **CORS errors** — verify `CLIENT_URL` in `backend/.env` matches the frontend origin (default `http://localhost:9999`).
- **CSRF failures on writes** — the client must fetch `GET /api/csrf-token` before non-GET requests; the SPA service layer does this automatically.
- **Login lockout** — after 5 failed attempts the account is locked for 15 minutes (DB-backed on `admin_users.failedLoginAttempts` / `lockedUntil`, survives restarts). To unlock early: `UPDATE admin_users SET "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE email = '...';`.
- **Production seeding refuses** — `NODE_ENV=production` requires `SEED_ADMIN_PASSWORD` to be set before `npm run seed`.

---

## License

Not specified in the project. All rights reserved by default.
