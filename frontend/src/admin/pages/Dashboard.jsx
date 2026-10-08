import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Radio,
  Shield,
  Users,
  Trophy,
  Newspaper,
  Plus,
  Clock,
  MapPin,
} from "lucide-react";
import { dashboardService } from "../../services/dashboardService.js";
import { Badge, PageHeader } from "../components/ui.jsx";

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    green: "bg-[#16A34A]/12 text-[#22C55E]",
    blue: "bg-[#3B82F6]/12 text-[#60A5FA]",
    red: "bg-[#DC2626]/12 text-[#EF4444]",
    yellow: "bg-[#F59E0B]/12 text-[#FBBF24]",
    purple: "bg-[#8B5CF6]/12 text-[#A78BFA]",
  };
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-display font-bold text-[var(--color-text)] leading-none">{value}</div>
        <div className="text-xs text-[#64748B] mt-1">{label}</div>
      </div>
    </div>
  );
}

function matchStatusColor(status) {
  const map = {
    LIVE: "green",
    UPCOMING: "blue",
    FT: "slate",
    POSTPONED: "yellow",
    CANCELLED: "red",
  };
  return map[status] || "slate";
}

function ScoreBlock({ match }) {
  const home = match.homeTeam.shortName || match.homeTeam.name;
  const away = match.awayTeam.shortName || match.awayTeam.name;
  return (
    <div className="flex flex-col gap-2 py-0.5">
      <div className="flex items-center gap-2">
        <span>{match.homeTeam.logo || "⚽"}</span>
        <span className="text-[var(--color-text)] truncate max-w-[120px]">{home}</span>
        <span className="text-[var(--color-text)] font-semibold ml-auto">
          {match.homeScore ?? "-"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span>{match.awayTeam.logo || "⚽"}</span>
        <span className="text-[var(--color-text)] truncate max-w-[120px]">{away}</span>
        <span className="text-[var(--color-text)] font-semibold ml-auto">
          {match.awayScore ?? "-"}
        </span>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [live, setLive] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.stats(),
      dashboardService.recentMatches(),
      dashboardService.liveMatches(),
      dashboardService.activity({ limit: 8 }),
    ])
      .then(([s, rm, lm, act]) => {
        setStats(s.stats);
        setRecent(rm.matches || []);
        setLive(lm.matches || []);
        setActivity(act.items || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-white border border-[var(--color-border)] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of the E-Soccer platform"
        actions={
          <>
            <Link
              to="/admin/matches/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#22C55E] text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Match
            </Link>
            <Link
              to="/admin/news/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] text-[var(--color-text)] text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Write News
            </Link>
          </>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/25 text-[#F87171] text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard icon={CalendarDays} label="Total Matches" value={stats?.totalMatches ?? 0} color="green" />
        <StatCard icon={Radio} label="Live Matches" value={stats?.liveMatches ?? 0} color="red" />
        <StatCard icon={Shield} label="Teams" value={stats?.totalTeams ?? 0} color="blue" />
        <StatCard icon={Users} label="Players" value={stats?.totalPlayers ?? 0} color="purple" />
        <StatCard icon={Trophy} label="Competitions" value={stats?.totalCompetitions ?? 0} color="yellow" />
        <StatCard icon={Newspaper} label="News Articles" value={stats?.totalNews ?? 0} color="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide">Recent Matches</h2>
              <Link to="/admin/matches" className="text-xs text-[#22C55E] hover:underline">
                View all
              </Link>
            </div>
            <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[#64748B]">Competition</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[#64748B]">Teams</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-[#64748B]">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-[#64748B]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((m) => (
                    <tr key={m.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="px-4 py-3 text-xs text-[#64748B]">{m.competition?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <ScoreBlock match={m} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge color={matchStatusColor(m.status)}>{m.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[#64748B]">
                        {formatDate(m.date)}
                      </td>
                    </tr>
                  ))}
                  {!recent.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-[#94A3B8]">
                        No matches yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide mb-3">
              Live Matches
            </h2>
            {live.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {live.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white border border-[#16A34A]/25 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#22C55E] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse inline-block" />
                        {m.competition?.name || "Live"}
                      </span>
                      <Badge color="green">LIVE {m.minute}'</Badge>
                    </div>
                    <ScoreBlock match={m} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-8 text-center text-sm text-[#94A3B8]">
                No live matches right now
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { to: "/admin/matches/create", label: "Add Match", icon: CalendarDays },
                { to: "/admin/teams/create", label: "Add Team", icon: Shield },
                { to: "/admin/players/create", label: "Add Player", icon: Users },
                { to: "/admin/competitions/create", label: "Add Competition", icon: Trophy },
              ].map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-[var(--color-border)] hover:border-[#16A34A]/40 hover:bg-[#16A34A]/5 transition-colors text-center"
                >
                  <a.icon className="w-5 h-5 text-[#22C55E]" />
                  <span className="text-xs text-[var(--color-text)]">{a.label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide mb-3">Recent Activity</h2>
            <div className="bg-white border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
              {activity.map((a) => (
                <div key={a.id} className="px-4 py-3 text-xs leading-relaxed">
                  <p className="text-[var(--color-text)]">{a.action}</p>
                  <p className="text-[#94A3B8] mt-0.5">
                    {formatDate(a.createdAt)} · {a.entity || "System"}
                  </p>
                </div>
              ))}
              {!activity.length && (
                <div className="px-4 py-8 text-center text-sm text-[#94A3B8]">No recent activity</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
