import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { teamService } from "../services/teamService.js";
import { MatchCard } from "../components/common/Cards.jsx";
import { ArrowLeft, MapPin, Trophy, Calendar } from "lucide-react";

const tabs = ["Overview", "Matches", "Squad", "Statistics"];

function matchesTeam(teamName, matchName) {
  if (!matchName) return false;
  if (teamName === matchName) return true;
  return (
    matchName.includes(teamName) ||
    teamName.includes(matchName) ||
    matchName.replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase().includes(teamName.replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase())
  );
}

const TeamDetails = ({ setSearchOpen, favorites, setFavorites }) => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("Overview");
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teamService.get(id).then((res) => {
      if (res.success) {
        setTeam(res.team);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/teams" className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>
        <div className="es-card p-12 text-center">
          <p className="text-[var(--color-text-muted)] text-sm">Loading team...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/teams" className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>
        <div className="text-center text-[var(--color-text-muted)]">Team not found</div>
      </div>
    );
  }

  const teamPlayers = team.players || [];
  const allMatches = [...(team.homeMatches || []), ...(team.awayMatches || [])];
  const teamMatches = allMatches.sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalGoals = teamPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
  const totalAssists = teamPlayers.reduce((sum, p) => sum + (p.assists || 0), 0);
  const totalYellowCards = teamPlayers.reduce((sum, p) => sum + (p.yellowCards || 0), 0);
  const avgGoals = teamMatches.length > 0 ? (totalGoals / teamMatches.length).toFixed(1) : "0.0";

  const recentForm = typeof team.form === "string" ? team.form.split("-") : team.form || [];

  const formColor = (result) => {
    if (result === "W") return "bg-[var(--color-green)] text-white";
    if (result === "D") return "bg-[var(--color-gold)] text-white";
    return "bg-[var(--color-red)] text-white";
  };

  const mappedMatches = teamMatches.map((m) => ({
    ...m,
    homeTeam: m.homeTeam?.name || m.homeTeam,
    homeLogo: m.homeTeam?.logo || "",
    awayTeam: m.awayTeam?.name || m.awayTeam,
    awayLogo: m.awayTeam?.logo || "",
  }));

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link to="/teams" className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </Link>

      <div className="es-card-static p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-green-dim)] border border-[var(--color-border)] text-3xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            {team.logo && team.logo.startsWith("/") ? (
              <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
            ) : (
              team.logo || team.name?.charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-[var(--color-text)] truncate">{team.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">{team.city}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-green-dim)] text-[var(--color-green)]">
                <Trophy className="w-3 h-3" />
                {team.competition?.name || ""}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-green-dim)] text-[var(--color-text-secondary)]">
                <Calendar className="w-3 h-3" />
                Est. {team.founded}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={
              activeTab === tab
                ? "bg-[var(--color-green)] text-white rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap"
                : "text-[var(--color-text-secondary)] hover:text-white px-4 py-2 text-sm whitespace-nowrap"
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="space-y-6">
          {recentForm.length > 0 && (
            <div className="es-card p-5">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Recent Form</h3>
              <div className="flex gap-1.5">
                {recentForm.map((result, i) => (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center ${formColor(result)}`}
                  >
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="es-card p-5">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">Team Info</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Stadium</div>
                <div className="text-sm font-medium text-[var(--color-text)]">{team.stadium || "N/A"}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Capacity</div>
                <div className="text-sm font-medium text-[var(--color-text)]">{team.capacity?.toLocaleString() || "N/A"}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Founded</div>
                <div className="text-sm font-medium text-[var(--color-text)]">{team.founded || "N/A"}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Competition</div>
                <div className="text-sm font-medium text-[var(--color-text)]">{team.competition?.name || "N/A"}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Home Jersey</div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded border border-[var(--color-border)]" style={{ backgroundColor: team.homeJersey || "#16A34A" }} />
                  <span className="text-sm font-medium text-[var(--color-text)]">{team.homeJersey || "N/A"}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Away Jersey</div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded border border-[var(--color-border)]" style={{ backgroundColor: team.awayJersey || "#FFFFFF" }} />
                  <span className="text-sm font-medium text-[var(--color-text)]">{team.awayJersey || "N/A"}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">Club Type</div>
                <div className="text-sm font-medium text-[var(--color-text)]">{team.type || "N/A"}</div>
              </div>
            </div>
          </div>

          {team.description && (
            <div className="es-card p-5">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">About</h3>
              <p className="text-sm text-[var(--color-text)] leading-relaxed">{team.description}</p>
            </div>
          )}

          {(team.website || team.facebook || team.telegram || team.instagram || team.phone || team.email) && (
            <div className="es-card p-5">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Contact & Social</h3>
              <div className="flex flex-wrap gap-3">
                {team.phone && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.04] text-xs text-[var(--color-text)]">📞 {team.phone}</span>}
                {team.email && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.04] text-xs text-[var(--color-text)]">✉️ {team.email}</span>}
                {team.website && <a href={team.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-green-dim)] text-xs text-[var(--color-green)] hover:opacity-80">🌐 Website</a>}
                {team.facebook && <a href={team.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1877F2]/10 text-xs text-[#1877F2] hover:opacity-80">Facebook</a>}
                {team.telegram && <a href={team.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0088CC]/10 text-xs text-[#0088CC] hover:opacity-80">Telegram</a>}
                {team.instagram && <a href={team.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E4405F]/10 text-xs text-[#E4405F] hover:opacity-80">Instagram</a>}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "Matches" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mappedMatches.length === 0 ? (
            <div className="col-span-full text-center py-12 text-[var(--color-text-muted)]">No matches found</div>
          ) : (
            mappedMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))
          )}
        </div>
      )}

      {activeTab === "Squad" && (
        <div className="es-card">
          <div className="divide-y divide-black/[0.08]">
            {teamPlayers.length === 0 ? (
              <div className="text-center py-12 text-[var(--color-text-muted)]">No players found</div>
            ) : (
              teamPlayers.map((player) => (
                <div key={player.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-green-dim)] border border-[var(--color-border)] flex items-center justify-center text-sm font-bold text-[var(--color-green)] flex-shrink-0">
                    {player.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--color-text)] truncate">{player.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{player.position}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-[var(--color-text)]">{player.goals || 0}G</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{player.assists || 0}A</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "Statistics" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="es-card p-5 text-center">
            <div className="text-xs text-[var(--color-text-muted)] mb-2">Total Goals</div>
            <div className="text-3xl font-display font-bold text-[var(--color-green)]">{totalGoals}</div>
          </div>
          <div className="es-card p-5 text-center">
            <div className="text-xs text-[var(--color-text-muted)] mb-2">Total Assists</div>
            <div className="text-3xl font-display font-bold text-[var(--color-text)]">{totalAssists}</div>
          </div>
          <div className="es-card p-5 text-center">
            <div className="text-xs text-[var(--color-text-muted)] mb-2">Yellow Cards</div>
            <div className="text-3xl font-display font-bold text-[var(--color-gold)]">{totalYellowCards}</div>
          </div>
          <div className="es-card p-5 text-center">
            <div className="text-xs text-[var(--color-text-muted)] mb-2">Avg Goals / Match</div>
            <div className="text-3xl font-display font-bold text-[var(--color-green)]">{avgGoals}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetails;
