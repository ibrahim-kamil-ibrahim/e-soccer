import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { dashboardService } from "../services/dashboardService.js";
import { competitionService } from "../services/competitionService.js";
import { teamService } from "../services/teamService.js";
import { newsService } from "../services/newsService.js";
import { LiveMatchCard, MatchCard, UpcomingMatchCard, NewsCard, TeamCard, CompetitionCard } from "../components/common/Cards.jsx";
import { MatchSkeleton, EmptyState } from "../components/common/LoadingSkeletons.jsx";
import { Calendar, TrendingUp, ChevronRight, Clock, Award, MapPin, Users, Goal } from "lucide-react";

function StatusBadgeInline({ status }) {
  const config = {
    LIVE: "hero-badge-live",
    FINISHED: "bg-black/5 text-[var(--color-text-secondary)]",
    SCHEDULED: "bg-black/5 text-[var(--color-text-secondary)]",
    POSTPONED: "bg-[#F59E0B]/10 text-[#B45309]",
    CANCELLED: "bg-[#EF4444]/10 text-[#DC2626]",
  };
  const label = status === "SCHEDULED" ? "UPCOMING" : status === "FINISHED" ? "FT" : status;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${config[status] || config.FINISHED}`}>
      {status === "LIVE" && <span className="live-dot"></span>}
      {label}
    </span>
  );
}

function mapMatch(m) {
  const d = m.date ? new Date(m.date) : null;
  return {
    ...m,
    homeTeam: m.homeTeam?.name || m.homeTeam,
    awayTeam: m.awayTeam?.name || m.awayTeam,
    homeLogo: m.homeTeam?.logo || m.homeLogo || "",
    awayLogo: m.awayTeam?.logo || m.awayLogo || "",
    competition: m.competition?.name || m.competition,
    date: d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : m.date || '',
  };
}

export default function Home({ setSearchOpen, favorites, setFavorites }) {
  const [liveMatches, setLiveMatches] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [topScorers, setTopScorers] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [news, setNews] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [liveRes, recentRes, scorersRes, compsRes, teamsRes, newsRes] = await Promise.all([
          dashboardService.liveMatches(),
          dashboardService.recentMatches(),
          dashboardService.topScorers(),
          competitionService.list({ limit: 6 }),
          teamService.list({ limit: 6 }),
          newsService.list({ limit: 3 }),
        ]);
        setLiveMatches((liveRes.matches || []).map(mapMatch));
        setRecentMatches((recentRes.matches || []).map(mapMatch));
        setTopScorers(scorersRes.scorers || []);
        setCompetitions((compsRes.items || []).map((c) => ({
          ...c,
          teams: c._count?.teams ?? c.teams ?? 0,
        })));
        setTeams((teamsRes.items || []).map((t) => ({
          ...t,
          competition: t.competition?.name || t.competition || "",
          logo: t.logo || "",
          form: t.form || "",
          city: t.city || "",
        })));
        setNews((newsRes.items || []).map((n) => ({
          ...n,
          date: n.publishedAt
            ? new Date(n.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
            : n.date || "",
          image: n.coverImage || "📰",
        })));
        if (compsRes.items?.length > 0) {
          try {
            const standRes = await dashboardService.standings(compsRes.items[0].id);
            setStandings(standRes.standings || []);
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load home data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const todaysMatches = recentMatches;
  const featuredMatch = todaysMatches.find((m) => m.isFinished) || todaysMatches[0];

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <MatchSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      {/* Hero Section - Featured Match */}
      <section className="hero-bg -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16 hero-animate">
        <div className="relative z-10 max-w-[1440px] mx-auto">
          <div className="flex flex-col items-center text-center gap-3 mb-8">
            <img src="/logo.png" alt="E-Soccer" className="h-12 w-auto object-contain" />
            <p className="text-[var(--color-text-secondary)] text-sm max-w-md">Your home of Ethiopian football — live scores, standings, teams, and news from Dire Dawa and beyond.</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="h-px w-8 sm:w-14 bg-gradient-to-r from-transparent to-[var(--color-green)]/60"></span>
              <span className="hero-tag text-xs font-bold px-4 py-1.5 rounded-full tracking-wider">FEATURED MATCH</span>
              <span className="h-px w-8 sm:w-14 bg-gradient-to-l from-transparent to-[var(--color-green)]/60"></span>
            </div>
            <span className="text-[var(--color-text-secondary)] text-xs font-medium uppercase tracking-[0.22em]">{featuredMatch?.competition}</span>
          </div>
          {featuredMatch ? (
            <div className="hero-card">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 lg:gap-10">
                {/* Home team */}
                <div className="lg:flex-1 flex items-center justify-center lg:justify-end">
                  <div className="hero-panel text-right">
                    <div>
                      <div className="hero-team-side mb-1.5">Home</div>
                      <div className="hero-team-name">{featuredMatch.homeTeam}</div>
                    </div>
                    <span className="hero-logo-deco order-first lg:order-last">{featuredMatch.homeLogo}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center gap-3.5 px-2">
                  <StatusBadgeInline status={featuredMatch.isFinished ? "FINISHED" : featuredMatch.isLive ? "LIVE" : featuredMatch.status || "SCHEDULED"} />
                  <div className="flex items-center gap-3">
                    <span className="score-num">{featuredMatch.homeScore}</span>
                    <span className="score-num score-num-colon">:</span>
                    <span className="score-num">{featuredMatch.awayScore}</span>
                  </div>
                  <span className="text-[var(--color-text-secondary)] text-xs font-medium">{featuredMatch.date} · {featuredMatch.timeField || featuredMatch.time}</span>
                </div>

                {/* Away team */}
                <div className="lg:flex-1 flex items-center justify-center lg:justify-start">
                  <div className="hero-panel text-left">
                    <span className="hero-logo-deco">{featuredMatch.awayLogo}</span>
                    <div>
                      <div className="hero-team-side mb-1.5">Away</div>
                      <div className="hero-team-name">{featuredMatch.awayTeam}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-meta-strip">
                <span className="inline-flex items-center gap-2">
                  <MapPin size={13} className="hero-meta-icon" />
                  {featuredMatch.venue || "Dire Dawa Stadium"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Users size={13} className="hero-meta-icon" />
                  {featuredMatch.attendance ? `${featuredMatch.attendance.toLocaleString()} attendance` : "Attendance TBD"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Goal size={13} className="hero-meta-icon" />
                  {featuredMatch.referee ? `Referee · ${featuredMatch.referee}` : "Referee TBD"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Link to="/matches" className="text-[var(--color-green)] font-semibold hover:opacity-80">View all matches</Link>
            </div>
          )}
        </div>
      </section>

      {/* Live Matches */}
      <section className="slide-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="live-dot"></span>
          <h2 className="text-lg font-bold text-[var(--color-text)] section-heading">Live Now</h2>
          <span className="badge-red text-[10px]">Real-time</span>
        </div>
        {liveMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map((m) => (
              <LiveMatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <EmptyState icon="📅" title="No Live Matches" description="No matches are currently live." />
        )}
      </section>

      {/* Today's Matches */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Calendar className="text-[var(--color-green)]" size={18} />
            <h2 className="text-lg font-bold text-[var(--color-text)] section-heading">Today&apos;s Matches</h2>
          </div>
          <Link to="/matches" className="text-[var(--color-green)] text-sm font-semibold hover:opacity-80 flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {todaysMatches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      </section>

      {/* Upcoming Matches */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Clock className="text-[var(--color-green)]" size={18} />
            <h2 className="text-lg font-bold text-[var(--color-text)] section-heading">Upcoming Matches</h2>
          </div>
          <Link to="/matches" className="text-[var(--color-green)] text-sm font-semibold hover:opacity-80 flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentMatches.filter((m) => m.status === "SCHEDULED").map((m) => (
            <UpcomingMatchCard key={m.id} match={m} />
          ))}
        </div>
      </section>

      {/* League Standings & Top Scorers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* League Standings */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Award className="text-[var(--color-green)]" size={18} />
              <h2 className="text-lg font-bold text-[var(--color-text)] section-heading">League Standings</h2>
              <span className="badge-muted text-[10px]">Dire Dawa Higher Division</span>
            </div>
          </div>
          <div className="es-card-static overflow-hidden">
            <table className="w-full">
              <thead className="bg-black/[0.02] border-b border-[var(--color-border)]">
                <tr>
                  <th className="w-12 px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold text-center">#</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">TEAM</th>
                  <th className="text-center w-12 px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">P</th>
                  <th className="text-center w-12 px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">W</th>
                  <th className="text-center w-12 px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">D</th>
                  <th className="text-center w-12 px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">L</th>
                  <th className="text-center w-12 px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">GD</th>
                  <th className="text-center w-12 px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.length > 0 ? standings.map((row) => (
                  <tr key={row.teamId || row.rank} className="border-b border-black/[0.06] hover:bg-black/[0.02]">
                    <td className="px-4 py-3 text-center">
                      <span className={`font-display font-bold ${row.rank <= 3 ? "text-[var(--color-green)]" : "text-[var(--color-text-muted)]"} ${row.rank === 1 ? "font-extrabold" : ""}`}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-md bg-[var(--color-green-dim)] text-sm flex items-center justify-center">{row.logo || "⚽"}</span>
                        <span className="text-sm font-medium text-[var(--color-text)]">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-[var(--color-text-secondary)]">{row.played}</td>
                    <td className="px-4 py-3 text-center text-xs text-[var(--color-text-secondary)]">{row.won}</td>
                    <td className="px-4 py-3 text-center text-xs text-[var(--color-text-secondary)]">{row.drawn}</td>
                    <td className="px-4 py-3 text-center text-xs text-[var(--color-text-secondary)]">{row.lost}</td>
                    <td className="px-4 py-3 text-center text-xs text-[var(--color-text-secondary)]">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                    <td className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text)]">{row.points}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-[var(--color-text-muted)] text-sm">No standings data yet. Add competitions and matches in the admin panel.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Scorers */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="text-[var(--color-green)]" size={18} />
              <h2 className="text-lg font-bold text-[var(--color-text)] section-heading">Top Scorers</h2>
            </div>
            <Link to="/players" className="text-[var(--color-green)] text-sm font-semibold hover:opacity-80 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="es-card-static overflow-hidden">
            <div className="divide-y divide-black/[0.06]">
              {topScorers.slice(0, 6).map((s, i) => (
                <div key={s.id || i} className="flex items-center gap-3 p-3.5">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]" : i === 1 ? "bg-[var(--color-green-dim)] text-[var(--color-text-secondary)]" : i === 2 ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]/70" : "bg-black/[0.03] text-[var(--color-text-muted)]"}`}>
                    {i + 1}
                  </span>
                  <span className="w-10 h-10 rounded-xl bg-[var(--color-green-dim)] border border-[var(--color-border)] flex items-center justify-center text-sm font-bold text-[var(--color-green)]">
                    {s.name?.[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[var(--color-text)] block truncate">{s.name}</span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">{s.team}</span>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-lg font-display font-extrabold text-[var(--color-text)]">{s.goals}</span>
                    <span className="block text-[10px] text-[var(--color-text-muted)]">goals</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Competitions & Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Featured Competitions */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--color-text)] section-heading">Competitions</h2>
            <Link to="/competitions" className="text-[var(--color-green)] text-sm font-semibold hover:opacity-80 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {competitions.slice(0, 4).map((c) => (
              <CompetitionCard key={c.id} competition={c} />
            ))}
          </div>
        </div>

        {/* Featured Teams */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--color-text)] section-heading">Featured Teams</h2>
            <Link to="/teams" className="text-[var(--color-green)] text-sm font-semibold hover:opacity-80 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teams.slice(0, 6).map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
        </div>
      </div>

      {/* Latest News */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--color-text)] section-heading">Latest News</h2>
          <Link to="/news" className="text-[var(--color-green)] text-sm font-semibold hover:opacity-80 flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.slice(0, 6).map((n) => (
            <NewsCard key={n.id} article={n} />
          ))}
        </div>
      </section>
    </div>
  );
}
