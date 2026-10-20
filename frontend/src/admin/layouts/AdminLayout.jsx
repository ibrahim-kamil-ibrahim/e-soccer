import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Trophy,
  Shield,
  Users,
  Newspaper,
  Image as ImageIcon,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  MapPin,
  Clock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { ToastProvider } from "../components/Toast.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { Sun, Moon } from "lucide-react";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/matches", label: "Matches", icon: CalendarDays },
  { to: "/admin/competitions", label: "Competitions", icon: Trophy },
  { to: "/admin/teams", label: "Teams", icon: Shield },
  { to: "/admin/cities", label: "Cities", icon: MapPin },
  { to: "/admin/players", label: "Players", icon: Users },
  { to: "/admin/news", label: "News", icon: Newspaper },
  { to: "/admin/media", label: "Media", icon: ImageIcon },
  { to: "/admin/activity", label: "Activity", icon: Clock, roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/admin/users", label: "Users", icon: UserCog, roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/admin/settings", label: "Settings", icon: Settings, roles: ["SUPER_ADMIN", "ADMIN"] },
];

function visibleNav(userRole) {
  return NAV.filter((item) => !item.roles || item.roles.includes(userRole));
}

const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EDITOR: "Editor",
};

function Sidebar({ mobile, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const content = (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-green-dim)] border border-[#16A34A]/30 flex items-center justify-center">
            <span className="text-lg leading-none">⚽</span>
          </div>
          <div>
            <div className="font-display font-bold text-[var(--color-text)] text-sm leading-none">E-SOCCER</div>
            <div className="text-[10px] text-[#64748B] tracking-[0.2em] uppercase mt-1">Admin Panel</div>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[var(--color-text)]" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleNav(user?.role).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/admin/dashboard"}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[var(--color-green-dim)] text-[#22C55E] font-medium border border-[#16A34A]/20"
                  : "text-[#64748B] hover:text-[var(--color-text)] hover:bg-black/[0.03]"
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
            <ChevronRight className="w-3 h-3 ml-auto opacity-30" />
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#16A34A] text-white flex items-center justify-center text-xs font-bold">
            {user?.name?.charAt(0) || "A"}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-[var(--color-text)] truncate">{user?.name}</div>
            <div className="text-xs text-[#64748B]">{ROLE_LABELS[user?.role]}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#F87171] hover:bg-[#DC2626]/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );

  if (!mobile) return <div className="hidden lg:block w-60 shrink-0">{content}</div>;

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
      <div className="w-72 h-full">{content}</div>
    </div>
  );
}

function ThemeToggleButton() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-[#64748B] hover:text-[var(--color-text)] hover:bg-black/[0.04] transition-colors"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function Topbar({ onMenu }) {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-14 bg-white/90 backdrop-blur border-b border-[var(--color-border)]">
      <button
        onClick={onMenu}
        className="lg:hidden p-2 rounded-lg text-[#64748B] hover:text-[var(--color-text)] hover:bg-black/[0.04]"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden lg:block text-sm text-[#64748B]">
        E-Soccer Management Console
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggleButton />
        <a
        href="/"
        className="text-sm text-[#64748B] hover:text-[var(--color-text)] transition-colors mr-1"
      >
        View Website →
      </a>
      </div>
    </header>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.backgroundImage = "none";
    return () => {
      document.body.style.backgroundImage = "";
    };
  }, []);

  return (
    <ToastProvider>
      <div id="es-admin-root" className="flex h-screen bg-white overflow-hidden">
        <Sidebar mobile={false} />
        {mobileOpen && <Sidebar mobile onClose={() => setMobileOpen(false)} />}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onMenu={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 bg-[var(--color-surface-dim)]">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
