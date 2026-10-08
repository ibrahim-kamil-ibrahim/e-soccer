import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { competitionService } from "../services/competitionService.js";
import { MatchCard } from "../components/common/Cards.jsx";
import { ArrowLeft } from "lucide-react";

const TABS = ["Overview", "Matches", "Standings", "Teams", "Statistics"];

function getStanding(teamsParam, allMatches) {
  const stats = new Map(
    teamsParam.map((t) => [
      t.id,
      { name: t.shortName || t.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 },
    ])
  );
  allMatches.forEach((m) => {
    if (m.homeScore === null || m.awayScore === null) return;
    const homeId = m.homeTeam?.id;
    const awayId = m.awayTeam?.id;
    const home = homeId != null ? stats.get(homeId) : null;
    const away = awayId != null ? stats.get(awayId) : null;
    if (!home || !away) return;
    home.played++; away.played++;
    home.gf += m.homeScore; home.ga += m.awayScore;
    away.gf += m.awayScore; away.ga += m.homeScore;
    if (m.homeScore > m.awayScore) { home.won++; away.lost++; home.pts += 3; }
    else if (m.homeScore < m.awayScore) { away.won++; home.lost++; away.pts += 3; }
    else { home.drawn++; away.drawn++; home.pts++; away.pts++; }
  });
  return [...stats.values()]
    .map((s, i) => ({ rank: i + 1, ...s, gd: s.gf - s.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

function getOverviewStats(matches, teamsParam) {
  const totalGoals = matches.reduce((sum, m) => sum + ((m.homeScore || 0) + (m.awayScore || 0)), 0);
  return [
    { label: "Total Goals", value: totalGoals },
    { label: "Avg per Match", value: matches.length ? (totalGoals / matches.length).toFixed(1) : 0 },
    { label: "Teams", value: teamsParam.length },
    { label: "Matches Played", value: matches.length },
  ];
}

function getStatistics(teamsParam, matches) {
  const topScorer = teamsParam.reduce(
    (best, t) => (t.goals > (best?.goals || 0) ? t : best),
    null
  );
  const bestDefense = teamsParam.reduce(
    (best, t) => (best === null || t.goalsConceded < best.goalsConceded ? t : best),
    null
  );
  const mostWins = teamsParam.reduce(
    (best, t) => (t.won > (best?.won || 0) ? t : best),
    null
  );
  return [
    { label: "Top Scoring Team", value: topScorer?.name || "N/A", sub: topScorer ? `${topScorer.goals} goals` : "" },
    { label: "Best Defense", value: bestDefense?.name || "N/A", sub: bestDefense ? `${bestDefense.goalsConceded} conceded` : "" },
    { label: "Most Wins", value: mostWins?.name || "N/A", sub: mostWins ? `${mostWins.won} wins` : "" },
    { label: "Total Matches", value: matches.length },
  ];
}

export default function CompetitionDetails({ setSearchOpen, favorites, setFavorites }) {
  const { id } = useParams();
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");

  useEffect(() => {
    competitionService.get(id).then((res) => {
      if (res.success) {
        setCompetition(res.competition);
      }
      setLoading(false);
    });
  }, [id]);

  const allTeams = competition?.teams || [];
  const allMatches = competition?.matches || [];

  const standings = getStanding(allTeams, allMatches);
  const stats = getOverviewStats(allMatches, allTeams);
  const statistics = getStatistics(allTeams, allMatches);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="es-card p-12 text-center">
          <p className="text-[var(--color-text-muted)] text-sm">Loading competition...</p>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="es-card p-12 text-center space-y-3">
          <p className="text-[var(--color-text-secondary)] text-lg font-display">Competition not found</p>
          <Link to="/competitions" className="text-[var(--color-green)] text-sm hover:underline">
            Back to competitions
          </Link>
        </div>
      </div>
    );
  }

  const mappedMatches = allMatches.map((m) => ({
    ...m,
    homeTeam: m.homeTeam?.name || m.homeTeam,
    homeLogo: m.homeTeam?.logo || "",
    awayTeam: m.awayTeam?.name || m.awayTeam,
    awayLogo: m.awayTeam?.logo || "",
  }));

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Link
        to="/competitions"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Competitions
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-green-dim)] border border-[var(--color-border)] text-3xl flex items-center justify-center">
          {competition.logo || "🏆"}
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">{competition.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {competition.region} · {competition.season}
          </p>
        </div>
        <span
          className={`ml-auto px-3 py-1 rounded-lg text-xs font-medium ${
            competition.level === "elite" ? "badge-green" : "badge-muted"
          }`}
        >
          {competition.level}
        </span>
      </div>

      <div className="flex gap-1 bg-black/[0.03] rounded-xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t
                ? "bg-[var(--color-green)] text-white"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="es-card p-4 space-y-1">
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">{s.label}</p>
              <p className="font-display font-extrabold text-2xl text-[var(--color-text)]">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "Matches" && (
        <div className="space-y-3">
          {mappedMatches.length > 0 ? (
            mappedMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                favorites={favorites}
                setFavorites={setFavorites}
              />
            ))
          ) : (
            <div className="es-card p-12 text-center">
              <p className="text-[var(--color-text-muted)] text-sm">No matches scheduled</p>
            </div>
          )}
        </div>
      )}

      {tab === "Standings" && (
        <div className="es-card-static overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--color-text-muted)] text-xs uppercase tracking-wider border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Team</th>
                <th className="text-center px-4 py-3">P</th>
                <th className="text-center px-4 py-3">W</th>
                <th className="text-center px-4 py-3">D</th>
                <th className="text-center px-4 py-3">L</th>
                <th className="text-center px-4 py-3">GD</th>
                <th className="text-center px-4 py-3">PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr
                  key={row.rank}
                  className="border-b border-black/[0.06] hover:bg-black/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.rank}</td>
                  <td className="px-4 py-3 text-[var(--color-text)] font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">{row.played}</td>
                  <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">{row.won}</td>
                  <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">{row.drawn}</td>
                  <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">{row.lost}</td>
                  <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                  <td className="px-4 py-3 text-center text-[var(--color-text)] font-bold">{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Teams" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTeams.length > 0 ? (
            allTeams.map((team) => (
              <div key={team.id} className="es-card p-4">
                <p className="text-[var(--color-text)] font-medium">{team.name}</p>
                {team.city && (
                  <p className="text-[var(--color-text-muted)] text-xs mt-1">{team.city}</p>
                )}
              </div>
            ))
          ) : (
            <div className="es-card p-12 text-center col-span-full">
              <p className="text-[var(--color-text-muted)] text-sm">No teams listed</p>
            </div>
          )}
        </div>
      )}

      {tab === "Statistics" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statistics.map((s) => (
            <div key={s.label} className="es-card p-4 space-y-1">
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">{s.label}</p>
              <p className="font-display font-extrabold text-xl text-[var(--color-text)]">{s.value}</p>
              {s.sub && <p className="text-[var(--color-text-muted)] text-xs">{s.sub}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
