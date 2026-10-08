# E-Soccer — Dire Dawa Football Hub

A modern React-based football platform for Ethiopian football, featuring live scores, team profiles, player stats, competitions, and news for the Dire Dawa football ecosystem. Consumes a full Express + Prisma/PostgreSQL API.

## Tech Stack

- **React 19** + **Vite 8** (fast dev/build)
- **Tailwind CSS v4** (utility-first styling with `@theme` design tokens)
- **React Router 7** (client-side routing)
- **Lucide React** (icon library)
- **oxlint** (linting)

## Features

- **Featured Match Hero** — scoreboard-style banner with frosted-glass team panels, large live score, and venue/attendance/referee meta strip
- **Live Match Tracker** — real-time score indicators with live pulse indicators
- **Match Center** — detailed match view with lineups, events, statistics, and standings
- **Teams & Players** — browse profiles, stats, form guides, and squad lists
- **Competitions** — league tables computed from match results, fixtures, and details
- **News** — latest stories from the Dire Dawa football world
- **Favorites** — save teams, players, and competitions (persisted to `localStorage`)
- **Global Search** — modal search across teams, players, competitions, and news
- **Fully responsive** — horizontal nav on desktop, hamburger + bottom tab bar on mobile

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (runs on port 9999)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Project Structure

```
frontend/src/
├── admin/                   # Protected admin console (/admin/*)
│   ├── components/          # DataTable, Modal, ConfirmDialog, ui, Spinner, Toast
│   ├── contexts/            # AuthContext, ThemeContext
│   ├── layouts/             # AdminLayout (sidebar + topbar)
│   └── pages/               # 13 admin pages (Dashboard, TeamForm, MatchForm,
│                            # CompetitionForm, PlayerForm, City, Users,
│                            # Settings, Homepage, NewsForm, Media, Activity)
├── components/
│   ├── common/        # Cards, SearchOverlay, LoadingSkeletons
│   └── layout/        # Header, Footer, MobileBottomNav
├── data/              # Static data (used by backend seed, not runtime)
├── hooks/
├── pages/             # 15 public pages (Home, Matches, MatchCenter, etc.)
├── services/          # 12 API service modules (api.js + entity services)
├── utils/             # helpers (useLocalStorage, formatters, colors)
├── App.jsx            # Route definitions + global state (favorites, search)
├── main.jsx           # Entry point
└── index.css          # Design system: @theme tokens, fonts, brand styles
```

## Data & API

The frontend consumes a full backend API at `/api` (proxied to port 5000 in dev):

- **Auth** — JWT login/logout, role-based access (SUPER_ADMIN / ADMIN / EDITOR)
- **CRUD** — teams, players, matches, competitions, news, cities, media, users
- **Dashboard** — stats, live/recent matches, top scorers, standings, activity
- **Settings** — website + homepage configuration
- **Activity** — admin action log with pagination

Bulk delete is available on all admin list pages (Matches, Competitions, Teams, Cities, Players, News, Media, Users) via checkbox selection + confirmation dialog.

## Design System

`index.css` defines a single dark theme via Tailwind v4 `@theme` tokens:

- **Navy base** `#020817` with a stadium `bg.png` background texture and glassmorphism cards
- **Football green** `#16A34A` for accents, LIVE indicators, and brand elements
- **Typography** — Chakra Petch (display) + Inter (body)
- Global styles for `es-card`, badges, form pills, section headings, and the featured-match hero