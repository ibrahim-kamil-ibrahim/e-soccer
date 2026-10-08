import { useState } from "react"
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import Header, { MobileBottomNav, Footer } from "./components/layout/Header.jsx"
import { useLocalStorage } from "./utils/helpers.js"
import { SearchOverlay } from "./components/common/SearchOverlay.jsx"
import Home from "./pages/Home.jsx"
import Matches from "./pages/Matches.jsx"
import MatchCenter from "./pages/MatchCenter.jsx"
import Competitions from "./pages/Competitions.jsx"
import CompetitionDetails from "./pages/CompetitionDetails.jsx"
import Teams from "./pages/Teams.jsx"
import TeamDetails from "./pages/TeamDetails.jsx"
import Players from "./pages/Players.jsx"
import PlayerProfile from "./pages/PlayerProfile.jsx"
import News from "./pages/News.jsx"
import NewsArticle from "./pages/NewsArticle.jsx"
import SearchPage from "./pages/Search.jsx"
import Favorites from "./pages/Favorites.jsx"
import Profile from "./pages/Profile.jsx"
import NotFound from "./pages/NotFound.jsx"
import { AuthProvider } from "./admin/contexts/AuthContext.jsx"
import { ThemeProvider } from "./admin/contexts/ThemeContext.jsx"
import ProtectedRoute from "./admin/components/ProtectedRoute.jsx"
import AdminLayout from "./admin/layouts/AdminLayout.jsx"
import AdminLogin from "./admin/pages/Login.jsx"
import Dashboard from "./admin/pages/Dashboard.jsx"
import AdminMatches from "./admin/pages/Matches.jsx"
import MatchForm from "./admin/pages/MatchForm.jsx"
import AdminCompetitions from "./admin/pages/Competitions.jsx"
import CompetitionForm from "./admin/pages/CompetitionForm.jsx"
import AdminTeams from "./admin/pages/Teams.jsx"
import TeamForm from "./admin/pages/TeamForm.jsx"
import AdminPlayers from "./admin/pages/Players.jsx"
import PlayerForm from "./admin/pages/PlayerForm.jsx"
import PlayerDetail from "./admin/pages/PlayerDetail.jsx"
import Cities from "./admin/pages/Cities.jsx"
import AdminNews from "./admin/pages/News.jsx"
import NewsForm from "./admin/pages/NewsForm.jsx"
import Media from "./admin/pages/Media.jsx"
import Users from "./admin/pages/Users.jsx"
import Settings from "./admin/pages/Settings.jsx"
import Homepage from "./admin/pages/Homepage.jsx"

function PublicLayout({ favorites, setFavorites, searchOpen, setSearchOpen }) {
  return (
    <div id="site-root" className="h-screen w-full overflow-y-auto overscroll-contain flex flex-col relative z-10">
      <Header onSearchOpen={() => setSearchOpen(true)} favoritesCount={favorites.length} />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav favoritesCount={favorites.length} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

export default function App() {
  const [favorites, setFavorites] = useLocalStorage("es-favorites", [])
  const [searchOpen, setSearchOpen] = useState(false)
  const publicProps = { favorites, setFavorites, searchOpen, setSearchOpen }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout {...publicProps} />}>
            <Route path="/" element={<Home {...publicProps} />} />
            <Route path="/matches" element={<Matches {...publicProps} />} />
            <Route path="/match/:id" element={<MatchCenter {...publicProps} />} />
            <Route path="/competitions" element={<Competitions {...publicProps} />} />
            <Route path="/competitions/:id" element={<CompetitionDetails {...publicProps} />} />
            <Route path="/teams" element={<Teams {...publicProps} />} />
            <Route path="/teams/:id" element={<TeamDetails {...publicProps} />} />
            <Route path="/players" element={<Players {...publicProps} />} />
            <Route path="/players/:id" element={<PlayerProfile {...publicProps} />} />
            <Route path="/news" element={<News {...publicProps} />} />
            <Route path="/news/:id" element={<NewsArticle {...publicProps} />} />
            <Route path="/search" element={<SearchPage {...publicProps} />} />
            <Route path="/favorites" element={<Favorites {...publicProps} />} />
            <Route path="/profile" element={<Profile {...publicProps} />} />
            <Route path="*" element={<NotFound {...publicProps} />} />
          </Route>

          <Route path="/admin/login" element={<ThemeProvider><AdminLogin /></ThemeProvider>} />
          <Route
            path="/admin"
            element={
              <ThemeProvider>
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              </ThemeProvider>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="matches" element={<AdminMatches />} />
            <Route path="matches/create" element={<MatchForm />} />
            <Route path="matches/:id/edit" element={<MatchForm />} />
            <Route path="competitions" element={<AdminCompetitions />} />
            <Route path="competitions/create" element={<CompetitionForm />} />
            <Route path="competitions/:id/edit" element={<CompetitionForm />} />
            <Route path="teams" element={<AdminTeams />} />
            <Route path="teams/create" element={<TeamForm />} />
            <Route path="teams/:id/edit" element={<TeamForm />} />
            <Route path="cities" element={<Cities />} />
            <Route path="players" element={<AdminPlayers />} />
            <Route path="players/create" element={<PlayerForm />} />
            <Route path="players/:id" element={<PlayerDetail />} />
            <Route path="players/:id/edit" element={<PlayerForm />} />
            <Route path="news" element={<AdminNews />} />
            <Route path="news/create" element={<NewsForm />} />
            <Route path="news/:id/edit" element={<NewsForm />} />
            <Route path="media" element={<Media />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
            <Route path="homepage" element={<Homepage />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}