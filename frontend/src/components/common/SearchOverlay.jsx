import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, X, Users, User, Trophy, Newspaper } from "lucide-react";
import { teams } from "../../data/teams.js";
import { competitions } from "../../data/competitions.js";
import { news } from "../../data/news.js";
import { players } from "../../data/players.js";

export function SearchOverlay({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchedTeams = q
    ? teams.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.city && t.city.toLowerCase().includes(q))
      )
    : [];

  const matchedPlayers = q
    ? players.filter((p) => p.name.toLowerCase().includes(q))
    : [];

  const matchedCompetitions = q
    ? competitions.filter((c) => c.name.toLowerCase().includes(q))
    : [];

  const matchedNews = q
    ? news.filter((n) => n.title.toLowerCase().includes(q))
    : [];

  const hasResults =
    matchedTeams.length ||
    matchedPlayers.length ||
    matchedCompetitions.length ||
    matchedNews.length;

  const groups = [
    { key: "teams", icon: Users, label: "Teams", items: matchedTeams, to: (item) => `/teams/${item.id}`, getName: (item) => item.name },
    { key: "players", icon: User, label: "Players", items: matchedPlayers, to: (item) => `/players/${item.id}`, getName: (item) => item.name },
    { key: "competitions", icon: Trophy, label: "Competitions", items: matchedCompetitions, to: (item) => `/competitions/${item.id}`, getName: (item) => item.name },
    { key: "news", icon: Newspaper, label: "News", items: matchedNews, to: (item) => `/news/${item.id}`, getName: (item) => item.title },
  ];

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative max-w-lg mx-auto mt-20 mx-4">
        <div className="es-card-static p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams, players, competitions..."
              className="w-full bg-black/[0.03] border border-black/[0.06] rounded-xl px-4 py-3 text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-green)]/30"
            />
            <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {q && (
            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              {!hasResults && (
                <div className="text-center py-8 text-sm text-[var(--color-text-secondary)]">
                  No results found
                </div>
              )}

              {groups.map(
                (group) =>
                  group.items.length > 0 && (
                    <div key={group.key} className="mb-4">
                      <div className="flex items-center gap-2 px-2 mb-2 text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                        <group.icon className="w-3.5 h-3.5" />
                        {group.label}
                      </div>
                      {group.items.map((item) => (
                        <Link
                          key={item.id}
                          to={group.to(item)}
                          onClick={onClose}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/[0.03] transition"
                        >
                          <group.icon className="w-4 h-4 text-[var(--color-text-muted)]" />
                          <span className="text-sm text-[var(--color-text)]">{group.getName(item)}</span>
                          <span className="ml-auto text-xs text-[var(--color-text-muted)]">{group.label}</span>
                        </Link>
                      ))}
                    </div>
                  )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FilterBar({ filters, setFilters, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <select
          key={option.key}
          value={filters[option.key] || ""}
          onChange={(e) => setFilters({ ...filters, [option.key]: e.target.value })}
          className="bg-white border border-black/[0.06] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] appearance-none"
        >
          <option value="">All {option.label}</option>
          {option.values.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
