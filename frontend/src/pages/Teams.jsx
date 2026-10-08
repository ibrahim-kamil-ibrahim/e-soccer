import { useState, useEffect } from "react";
import { teamService } from "../services/teamService.js";
import { TeamCard } from "../components/common/Cards.jsx";
import { TeamSkeleton, EmptyState } from "../components/common/LoadingSkeletons.jsx";
import { Search } from "lucide-react";

const Teams = ({ setSearchOpen, favorites, setFavorites }) => {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [competitionFilter, setCompetitionFilter] = useState("all");

  useEffect(() => {
    teamService.list().then((res) => {
      if (res.success) {
        setTeams(res.items.map((t) => ({ ...t, competition: t.competition?.name || "" })));
      }
      setLoading(false);
    });
  }, []);

  const competitions = [...new Set(teams.map((t) => t.competition))];

  const filteredTeams = teams.filter((team) => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) || team.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompetition = competitionFilter === "all" || team.competition === competitionFilter;
    return matchesSearch && matchesCompetition;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">Teams</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/[0.03] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-green)]/50"
          />
        </div>
        <select
          value={competitionFilter}
          onChange={(e) => setCompetitionFilter(e.target.value)}
          className="bg-black/[0.03] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-green)]/50 cursor-pointer"
        >
          <option value="all">All Competitions</option>
          {competitions.map((comp) => (
            <option key={comp} value={comp} className="bg-white text-[var(--color-text)]">
              {comp}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <TeamSkeleton key={i} />
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <EmptyState icon="🛡️" title="No teams found" description="Try adjusting your search or filters." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              favorites={favorites}
              setFavorites={setFavorites}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Teams;
