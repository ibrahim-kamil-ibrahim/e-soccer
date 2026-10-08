import { useState, useEffect } from "react";
import { competitionService } from "../services/competitionService.js";
import { CompetitionCard } from "../components/common/Cards.jsx";
import { Search } from "lucide-react";

const REGIONS = ["All Regions", "Europe", "South America", "North America", "Africa", "Asia", "Oceania"];

export default function Competitions({ setSearchOpen, favorites, setFavorites }) {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All Regions");

  useEffect(() => {
    competitionService.list().then((res) => {
      if (res.success) {
        setCompetitions(res.items.map((c) => ({ ...c, teams: c._count?.teams ?? 0 })));
      }
      setLoading(false);
    });
  }, []);

  const filtered = competitions.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = region === "All Regions" || c.region === region;
    return matchesSearch && matchesRegion;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">Competitions</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search competitions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/[0.03] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-green)]/40 transition-colors"
          />
        </div>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="bg-black/[0.03] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-green)]/40 transition-colors appearance-none cursor-pointer"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r} className="bg-[var(--color-bg-primary)]">
              {r}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="es-card p-12 text-center">
          <p className="text-[var(--color-text-muted)] text-sm">Loading competitions...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((competition) => (
            <CompetitionCard
              key={competition.id}
              competition={competition}
              favorites={favorites}
              setFavorites={setFavorites}
            />
          ))}
        </div>
      ) : (
        <div className="es-card p-12 text-center space-y-3">
          <p className="text-[var(--color-text-secondary)] text-lg font-display">No competitions found</p>
          <p className="text-[var(--color-text-muted)] text-sm">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
