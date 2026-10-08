import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search,
  Bell,
  User,
  Menu,
  X,
  Home,
  Trophy,
  Users,
  Newspaper,
  ChevronRight,
  Heart,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", path: "/", icon: Home },
  { label: "Matches", path: "/matches", icon: Trophy },
  { label: "Competitions", path: "/competitions", icon: Trophy },
  { label: "Teams", path: "/teams", icon: Users },
  { label: "Players", path: "/players", icon: Users },
  { label: "News", path: "/news", icon: Newspaper },
];

const ICON_SIZE = 20;

export default function Header({ onSearchOpen }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.06]">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex flex-col items-start justify-center leading-none">
          <div className="h-8 flex items-center">
            <img src="/logo.png" alt="E-Soccer" className="h-full w-auto object-contain" />
          </div>
          <span className="mt-1 text-[9px] tracking-[0.18em] uppercase text-[var(--color-text-muted)]">
            Dire Dawa Football
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-3.5 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "text-[var(--color-green)] bg-[var(--color-green-dim)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-black/[0.03]"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[var(--color-green)] rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onSearchOpen}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-black/[0.03] transition-colors"
          >
            <Search size={ICON_SIZE} />
          </button>
          <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-black/[0.03] transition-colors">
            <Bell size={ICON_SIZE} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          </button>
          <Link
            to="/profile"
            className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-black/[0.03] transition-colors"
          >
            <User size={ICON_SIZE} />
          </Link>
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-black/[0.03] transition-colors"
          >
            <Menu size={ICON_SIZE} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-0 right-0 w-72 h-full bg-white border-l border-black/[0.06] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 h-16 border-b border-black/[0.06]">
              <div className="flex flex-col items-start justify-center leading-none">
                <div className="h-8 flex items-center">
                  <img src="/logo.png" alt="E-Soccer" className="h-full w-auto object-contain" />
                </div>
                <span className="mt-1 text-[9px] tracking-[0.18em] uppercase text-[var(--color-text-muted)]">
                  Dire Dawa Football
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-black/[0.03] transition-colors"
              >
                <X size={ICON_SIZE} />
              </button>
            </div>

            <nav className="flex-1 py-4 px-3 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-3 rounded-lg mb-1 transition-colors ${
                      isActive
                        ? "text-[var(--color-green)] bg-[var(--color-green-dim)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-black/[0.03]"
                    }`}
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <ChevronRight size={16} />
                  </Link>
                );
              })}

              <div className="border-t border-black/[0.06] my-3" />

              <Link
                to="/favorites"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-3 py-3 rounded-lg mb-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-black/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Heart size={ICON_SIZE} />
                  <span className="text-sm font-medium">Favorites</span>
                </div>
                <span className="text-xs bg-black/[0.04] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
                  0
                </span>
              </Link>

              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-3 py-3 rounded-lg mb-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-black/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <User size={ICON_SIZE} />
                  <span className="text-sm font-medium">Profile</span>
                </div>
                <ChevronRight size={16} />
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

export function MobileBottomNav() {
  const location = useLocation();

  const bottomItems = [
    { label: "Home", path: "/", icon: Home },
    { label: "Matches", path: "/matches", icon: Trophy },
    { label: "Competitions", path: "/competitions", icon: Trophy },
    { label: "Teams", path: "/teams", icon: Users },
    { label: "Saved", path: "/favorites", icon: Heart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-white/90 backdrop-blur-xl border-t border-black/[0.06]">
      <div className="flex items-center justify-around h-14 px-2">
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive
                  ? "text-[var(--color-green)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <item.icon size={18} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-black/[0.06] bg-[var(--color-surface-dim)] mt-16">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex flex-col items-start justify-center leading-none mb-4">
              <div className="h-9 flex items-center">
                <img src="/logo.png" alt="E-Soccer" className="h-full w-auto object-contain" />
              </div>
              <span className="mt-1.5 text-[10px] tracking-[0.18em] uppercase text-[var(--color-text-muted)]">
                Dire Dawa Football
              </span>
            </div>
            <p className="text-[var(--color-text-muted)] text-sm leading-relaxed max-w-xs">
              Your premier destination for Dire Dawa football coverage, live
              scores, and community engagement.
            </p>
          </div>

          <div>
            <h3 className="font-display font-semibold text-[var(--color-text)] text-sm mb-4 uppercase tracking-wider">
              Platform
            </h3>
            <ul className="space-y-2.5">
              {["Matches", "Competitions", "Teams", "Players", "News"].map(
                (label) => (
                  <li key={label}>
                    <Link
                      to={`/${label.toLowerCase()}`}
                      className="text-[var(--color-text-muted)] text-sm hover:text-[var(--color-green)] transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-[var(--color-text)] text-sm mb-4 uppercase tracking-wider">
              More
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: "Favorites", path: "/favorites" },
                { label: "Profile", path: "/profile" },
                { label: "Search", path: "/search" },
              ].map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="text-[var(--color-text-muted)] text-sm hover:text-[var(--color-green)] transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-[var(--color-text)] text-sm mb-4 uppercase tracking-wider">
              Connect
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: "Twitter / X", href: "#" },
                { label: "Instagram", href: "#" },
                { label: "Telegram", href: "#" },
                { label: "Contact", href: "#" },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-[var(--color-text-muted)] text-sm hover:text-[var(--color-green)] transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-black/[0.06] mt-10 pt-6 text-center">
          <p className="text-[var(--color-text-muted)] text-xs">
            &copy; 2026 E-Soccer. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
