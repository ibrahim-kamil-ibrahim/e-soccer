import { useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Header, { MobileBottomNav, Footer } from "./components/layout/Header.jsx";
import { useLocalStorage } from "./utils/helpers.js";
import { SearchOverlay } from "./components/common/SearchOverlay.jsx";
import { AuthProvider } from "./admin/contexts/AuthContext.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import { ThemeProvider } from "./admin/contexts/ThemeContext.jsx";
import ProtectedRoute from "./admin/components/ProtectedRoute.jsx";
import AdminLayout from "./admin/layouts/AdminLayout.jsx";

const Home = lazy(() => import("./pages/Home.jsx"));
const Matches = lazy(() => import("./pages/Matches.jsx"));
const MatchCenter = lazy(() => import("./pages/MatchCenter.jsx"));
const Competitions = lazy(() => import("./pages/Competitions.jsx"));
const CompetitionDetails = lazy(() => import("./pages/CompetitionDetails.jsx"));
const Teams = lazy(() => import("./pages/Teams.jsx"));
const TeamDetails = lazy(() => import("./pages/TeamDetails.jsx"));
const Players = lazy(() => import("./pages/Players.jsx"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile.jsx"));
const News = lazy(() => import("./pages/News.jsx"));
const NewsArticle = lazy(() => import("./pages/NewsArticle.jsx"));
const SearchPage = lazy(() => import("./pages/Search.jsx"));
const Favorites = lazy(() => import("./pages/Favorites.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

const AdminLogin = lazy(() => import("./admin/pages/Login.jsx"));
const Dashboard = lazy(() => import("./admin/pages/Dashboard.jsx"));
const AdminMatches = lazy(() => import("./admin/pages/Matches.jsx"));
const MatchForm = lazy(() => import("./admin/pages/MatchForm.jsx"));
const AdminCompetitions = lazy(() => import("./admin/pages/Competitions.jsx"));
const CompetitionForm = lazy(() => import("./admin/pages/CompetitionForm.jsx"));
const AdminTeams = lazy(() => import("./admin/pages/Teams.jsx"));
const TeamForm = lazy(() => import("./admin/pages/TeamForm.jsx"));
const AdminPlayers = lazy(() => import("./admin/pages/Players.jsx"));
const PlayerForm = lazy(() => import("./admin/pages/PlayerForm.jsx"));
const PlayerDetail = lazy(() => import("./admin/pages/PlayerDetail.jsx"));
const Cities = lazy(() => import("./admin/pages/Cities.jsx"));
const AdminNews = lazy(() => import("./admin/pages/News.jsx"));
const NewsForm = lazy(() => import("./admin/pages/NewsForm.jsx"));
const Media = lazy(() => import("./admin/pages/Media.jsx"));
const Users = lazy(() => import("./admin/pages/Users.jsx"));
const Settings = lazy(() => import("./admin/pages/Settings.jsx"));
const Profile = lazy(() => import("./admin/pages/Profile.jsx"));
const Activity = lazy(() => import("./admin/pages/Activity.jsx"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-[#16A34A] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PublicLayout({ favorites, setFavorites, searchOpen, setSearchOpen }) {
  return (
    <div id="site-root" className="h-screen w-full overflow-y-auto overscroll-contain flex flex-col relative z-10">
      <Header onSearchOpen={() => setSearchOpen(true)} favoritesCount={favorites.length} />
      <main className="flex-1 pb-20 md:pb-0">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <MobileBottomNav favoritesCount={favorites.length} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export default function App() {
  const [favorites, setFavorites] = useLocalStorage("es-favorites", {});
  const [searchOpen, setSearchOpen] = useState(false);
  const publicProps = { favorites, setFavorites, searchOpen, setSearchOpen };

  return (
    <BrowserRouter>
      <ErrorBoundary>
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
              <Route path="*" element={<NotFound {...publicProps} />} />
            </Route>

            <Route path="/admin/login" element={<ThemeProvider><Suspense fallback={<PageLoader />}><AdminLogin /></Suspense></ThemeProvider>} />
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
              <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="matches" element={<Suspense fallback={<PageLoader />}><AdminMatches /></Suspense>} />
              <Route path="matches/create" element={<Suspense fallback={<PageLoader />}><MatchForm /></Suspense>} />
              <Route path="matches/:id/edit" element={<Suspense fallback={<PageLoader />}><MatchForm /></Suspense>} />
              <Route path="competitions" element={<Suspense fallback={<PageLoader />}><AdminCompetitions /></Suspense>} />
              <Route path="competitions/create" element={<Suspense fallback={<PageLoader />}><CompetitionForm /></Suspense>} />
              <Route path="competitions/:id/edit" element={<Suspense fallback={<PageLoader />}><CompetitionForm /></Suspense>} />
              <Route path="teams" element={<Suspense fallback={<PageLoader />}><AdminTeams /></Suspense>} />
              <Route path="teams/create" element={<Suspense fallback={<PageLoader />}><TeamForm /></Suspense>} />
              <Route path="teams/:id/edit" element={<Suspense fallback={<PageLoader />}><TeamForm /></Suspense>} />
              <Route path="cities" element={<Suspense fallback={<PageLoader />}><Cities /></Suspense>} />
              <Route path="players" element={<Suspense fallback={<PageLoader />}><AdminPlayers /></Suspense>} />
              <Route path="players/create" element={<Suspense fallback={<PageLoader />}><PlayerForm /></Suspense>} />
              <Route path="players/:id" element={<Suspense fallback={<PageLoader />}><PlayerDetail /></Suspense>} />
              <Route path="players/:id/edit" element={<Suspense fallback={<PageLoader />}><PlayerForm /></Suspense>} />
              <Route path="news" element={<Suspense fallback={<PageLoader />}><AdminNews /></Suspense>} />
              <Route path="news/create" element={<Suspense fallback={<PageLoader />}><NewsForm /></Suspense>} />
              <Route path="news/:id/edit" element={<Suspense fallback={<PageLoader />}><NewsForm /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
              <Route path="media" element={<Suspense fallback={<PageLoader />}><Media /></Suspense>} />
              <Route path="users" element={<ProtectedRoute roles={["SUPER_ADMIN", "ADMIN"]}><Suspense fallback={<PageLoader />}><Users /></Suspense></ProtectedRoute>} />
              <Route path="activity" element={<ProtectedRoute roles={["SUPER_ADMIN", "ADMIN"]}><Suspense fallback={<PageLoader />}><Activity /></Suspense></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute roles={["SUPER_ADMIN", "ADMIN"]}><Suspense fallback={<PageLoader />}><Settings /></Suspense></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
