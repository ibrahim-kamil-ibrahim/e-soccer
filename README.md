# E-Soccer — Your Home of Ethiopian Football

> A full-stack football platform covering the Ethiopian football landscape, focused on the Dire Dawa region. React SPA + Express API + Prisma/PostgreSQL, with a role-based admin panel.

Public pages fetch all data live from the API. Admins manage teams, players, matches, news, competitions, cities, media, users, and site settings through a protected console.

---

## Project Structure

```
e/
├── backend/                 # Express + Prisma API (port 5000)
│   ├── prisma/
│   │   ├── schema.prisma    # 16 models, 7 enums
│   │   └── seed.js          # Seeds data + admin users
│   ├── src/
│   │   ├── config/          # env.js, prisma.js
│   │   ├── controllers/     # 10 controllers (auth, team, player, ...)
│   │   ├── middleware/      # auth (JWT), errorHandler, validate
│   │   ├── routes/          # 12 route files mounted at /api/*
│   │   ├── services/        # helpers, standings
│   │   ├── uploads/         # (served at /uploads)
│   │   ├── app.js           # Express app, CORS, middleware, routes
│   │   └── server.js        # Entry — listens on PORT (default 5000)
│   ├── .env / .env.example
│   └── package.json
│
├── frontend/                # React 19 + Vite 8 SPA (port 9999)
│   ├── public/              # logo.png, bg.png, favicon.svg, icons.svg
│   ├── src/
│   │   ├── pages/           # 15 public pages (Home, Matches, ...)
│   │   ├── admin/
│   │   │   ├── components/  # DataTable, Modal, ConfirmDialog, ui, ...
│   │   │   ├── contexts/    # AuthContext, ThemeContext
│   │   │   ├── layouts/     # AdminLayout (sidebar + topbar)
│   │   │   └── pages/       # 19 admin pages (Dashboard, TeamForm, ...)
│   │   ├── services/        # 12 API service modules (api.js + entity services)
│   │   ├── components/      # common/ (Cards, Search), layout/ (Header)
│   │   ├── data/            # Static seed data (used by backend seed)
│   │   ├── utils/           # helpers.js (formatters, useLocalStorage)
│   │   ├── App.jsx          # Routes: public + /admin/*
│   │   ├── main.jsx
│   │   └── index.css        # Design system (Tailwind v4 @theme)
│   ├── vite.config.js       # port 9999, proxies /api + /uploads → :5000
│   └── package.json
│
└── README.md
```

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
| Auth | **JWT** (httpOnly cookie + Bearer) + **bcryptjs** |
| Validation | **express-validator** (422 on failure) |
| Uploads | **multer** (disk storage, 5 MB, jpeg/png/webp/gif/svg) |
| Rate limiting | **express-rate-limit** (auth: 100 / 15 min) |
| Language | JavaScript (ES modules, `"type": "module"`) |

---

## Getting Started

### Prerequisites

- Node.js (recent LTS)
- PostgreSQL running locally (default DB `esoccer`)

### 1. Backend

```bash
cd backend
npm install                 # runs postinstall → prisma generate
cp .env.example .env        # then edit DATABASE_URL / secrets
npm run db:push             # sync schema (no migrations dir)
npm run seed                # optional — seed demo data + admin users
npm run dev                 # node --watch src/server.js → :5000
```

Health check: `GET http://localhost:5000/api/health` →
`{ "success": true, "message": "E-Soccer API is running" }`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # Vite → http://localhost:9999
```

The dev server proxies `/api` and `/uploads` to `http://localhost:5000` (see `vite.config.js`).

### 3. Production build

```bash
cd frontend
npm run build               # output → frontend/dist/
npm run preview             # local preview of the build
```

Backend production: `cd backend && npm start`.

### Scripts reference

| Where | Script | Command |
|-------|--------|---------|
| backend | `dev` | `node --watch src/server.js` |
| backend | `start` | `node src/server.js` |
| backend | `db:push` | `prisma db push` |
| backend | `seed` | `prisma db seed` → `node prisma/seed.js` |
| backend | `prisma:generate` | `prisma generate` |
| frontend | `dev` | `vite` |
| frontend | `build` | `vite build` |
| frontend | `preview` | `vite preview` |
| frontend | `lint` | `oxlint` |

---

## Environment Variables (`backend/.env`)

```bash
DATABASE_URL="postgresql://postgres:12341234@localhost:5432/esoccer?schema=public"
PORT=5000
CLIENT_URL=http://localhost:9999
JWT_SECRET=change-me-to-a-long-random-secret
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads
```

---

## Authentication & Roles

- **Login:** `POST /api/auth/login` with email **or** username + password. Returns a JWT **and** sets an httpOnly `token` cookie.
- **Me / Logout:** `GET /api/auth/me`, `POST /api/auth/logout`.
- **Token verification:** `requireAuth` reads cookie or `Authorization: Bearer` header; `requireRole(...roles)` enforces RBAC.
- **Roles** (`Role` enum): `SUPER_ADMIN`, `ADMIN`, `EDITOR`.
  - Writes (create/update): SUPER_ADMIN / ADMIN / EDITOR
  - Deletes: SUPER_ADMIN / ADMIN
  - User management: SUPER_ADMIN

**Seed logins:**

| Email | Password | Role |
|-------|----------|------|
| `admin@esoccer.et` | `admin1234` | SUPER_ADMIN |
| `editor@esoccer.et` | `editor1234` | EDITOR |
| `ibro@esoccer.et` | `12341234` | SUPER_ADMIN |

---

## API Overview

All endpoints are mounted under `/api`. List endpoints return `{ success, items, pagination }`; single-resource endpoints return `{ success, <entity> }`.

| Route file | Base path | Notes |
|------------|-----------|-------|
| `auth.js` | `/api/auth` | login, logout, me (rate-limited) |
| `teams.js` | `/api/teams` | CRUD, auto-slug |
| `players.js` | `/api/players` | CRUD, auto-slug + auto-age |
| `matches.js` | `/api/matches` | CRUD |
| `competitions.js` | `/api/competitions` | CRUD, cascade deletes |
| `news.js` | `/api/news` | CRUD |
| `cities.js` | `/api/cities` | CRUD + `/hierarchy`, `/subcities`, `/woredas`, `/kebeles` |
| `media.js` | `/api/media` | file upload / delete → `uploads/` |
| `users.js` | `/api/users` | admin user management (SUPER_ADMIN) |
| `settings.js` | `/api/settings` | website + homepage settings |
| `dashboard.js` | `/api/dashboard` | admin stats, standings, top scorers |
| `activity.js` | `/api/activity` | activity log |

---

## Database (Prisma → PostgreSQL)

**16 models:** `AdminUser`, `Competition`, `Season`, `City`, `Team`, `Player`, `Match`, `MatchEvent`, `MatchLineup`, `MatchStatistic`, `NewsArticle`, `Media`, `WebsiteSetting`, `HomepageSetting`, `Favorite`, `ActivityLog`

**7 enums:** `Role`, `UserStatus`, `PublicationStatus`, `MatchStatus`, `EventType`, `Side`, `MediaCategory`

Schema workflow is **`prisma db push`** (no `migrations/` directory). Run `npm run prisma:generate` after schema changes (also runs on `postinstall`).

### Ethiopian administrative hierarchy (City model)

`Region → City → Sub-city → Woreda → Kebele`, with `cityType` (Regional City / Zone City / Chartered City / Town) and optional lat/lng, logo, description. 14 regions are supported in the admin UI.

---

## Admin Panel

Protected under `/admin/*` (`ProtectedRoute` → login redirect; wrong role → dashboard). Sidebar nav: **Dashboard, Matches, Competitions, Teams, Cities, Players, News, Media, Homepage, Users, Settings** + Logout.

### Admin routes

| Path | Page |
|------|------|
| `/admin/login` | Login (no layout) |
| `/admin/dashboard` | Dashboard |
| `/admin/matches` (+ `/create`, `/:id/edit`) | Matches CRUD |
| `/admin/competitions` (+ `/create`, `/:id/edit`) | Competitions CRUD |
| `/admin/teams` (+ `/create`, `/:id/edit`) | Teams CRUD |
| `/admin/cities` | Cities CRUD (4-step wizard) |
| `/admin/players` (+ `/create`, `/:id/edit`) | Players CRUD |
| `/admin/news` (+ `/create`, `/:id/edit`) | News CRUD |
| `/admin/media` | Media library |
|| `/admin/users` | User management |
|| `/admin/settings` | Site settings |
|| `/admin/homepage` | Homepage settings |
|| `/admin/activity` | Activity log |

### Team form (MVP two-form structure)

- **Create** → **Basic Team Form** only (5 inputs): Team Name\*, Short Name\*, Team Logo, City\*, Description → Create
- **Edit** → **Basic Form + Team Management** (5 admin controls): Status (Active / Inactive / Archived), Published toggle, Featured Team toggle, Display Order, auto-generated Slug → Save Changes
- **Delete** → inline confirmation → Delete

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
| `/players` | `Players` | Filterable grid |
| `/players/:id` | `PlayerProfile` | Overview, Statistics, Matches |
| `/news` | `News` | Filterable grid |
| `/news/:id` | `NewsArticle` | Full article |
| `/search` | `SearchPage` | Delegates to global search overlay |
| `/favorites` | `Favorites` | Persisted in `localStorage` (`es-favorites`) |
| `/profile` | `Profile` | Mock user + preferences |
| `*` | `NotFound` | 404 fallback |

---

## Features

### Public site
- **Home** — featured-match hero (FEATURED MATCH badge), live-now indicator, today's fixtures, top competitions, featured teams, standings table (API-driven), top scorers, latest news
- **Matches** — tabbed views, date navigation, competition + team filters, status badges
- **Match Center** — full header, five tabs (Overview / Lineups / Events / Statistics / Table)
- **Competitions** — search + region filter, detail pages with standings computed from real match results
- **Teams** — search + competition filter, form guide, detail pages with logo/jerseys/contact/social
- **Players** — search + position/team filters, profile pages
- **News** — search + category filter, article pages
- **Global search** — header/bottom-nav modal across Teams, Players, Competitions, News
- **Favorites** — localStorage persistence
- **Responsive** — desktop nav + mobile hamburger/bottom tab bar

### Admin console
- JWT-protected, role-based (SUPER_ADMIN / ADMIN / EDITOR)
- Full CRUD for teams, players, matches, news, competitions, cities, media, users
- Multi-step wizard forms with file uploads (Team, Player, City)
- Ethiopian hierarchy (Region → City → Sub-city → Woreda → Kebele) with suggestion chips
- Team: Basic form (create) + Team Management controls (edit)
- Activity log for create/update/delete actions
- Dashboard with stats, standings, top scorers
- **Bulk delete** on all list pages (Matches, Competitions, Teams, Cities, Players, News, Media, Users) — checkbox selection + single confirmation dialog

---

## Design System

- **Theme:** light / white + football green (`#16A34A`); surfaces `#FFFFFF`, text `#1E293B`, borders `rgba(0,0,0,0.08)`
- **Status colors:** red `#EF4444` (LIVE / destructive), gold `#F59E0B` (warnings)
- **Typography:** **Chakra Petch** (display/headings) + **Inter** (body), loaded via Google Fonts and `@theme` tokens
- **Admin theme toggle** exists in the topbar (localStorage `es-admin-theme`); public site is fixed light

---

## Key Commands (quick reference)

```bash
# Backend — first run
cd backend && npm install && cp .env.example .env
npm run db:push && npm run seed && npm run dev

# Frontend
cd frontend && npm install && npm run dev     # http://localhost:9999

# After schema changes
cd backend && npm run db:push && npm run prisma:generate

# Production
cd frontend && npm run build
cd backend && npm start
```

### Troubleshooting

- **`EADDRINUSE` on :5000** — another Node process holds the port. Find it: `netstat -ano | findstr :5000`, then `taskkill /PID <pid> /F`. The server also prints a clean diagnostic on this error.
- **Prisma client out of sync** — run `npm run prisma:generate` in `backend/`.
- **Permission/EPERM during `prisma generate`** — kill running Node processes first (`taskkill /F /IM node.exe` on Windows).

---

## License

Not specified in the project. All rights reserved by default.
