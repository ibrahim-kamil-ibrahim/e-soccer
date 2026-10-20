import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchService } from '../services/matchService.js';
import { PossessionBar } from '../components/common/Cards.jsx';
import { MatchSkeleton } from '../components/common/LoadingSkeletons.jsx';
import { ArrowLeft } from 'lucide-react';

function mapMatch(m) {
  if (!m) return null;
  return {
    ...m,
    homeTeam: m.homeTeam?.name || m.homeTeam,
    awayTeam: m.awayTeam?.name || m.awayTeam,
    homeLogo: m.homeTeam?.logo || m.homeLogo || '',
    awayLogo: m.awayTeam?.logo || m.awayLogo || '',
    competition: m.competition?.name || m.competition,
  };
}

export default function MatchCenter({
  setSearchOpen,
  favorites,
  setFavorites,
}) {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [lineups, setLineups] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const load = useCallback(async () => {
    try {
      const res = await matchService.get(id);
      const raw = res.match || res;
      setMatch(mapMatch(raw));
      setEvents(raw.events || []);
      setStatistics(raw.statistics || null);
      setLineups(Array.isArray(raw.lineups) ? raw.lineups : raw.lineups ? [raw.lineups] : []);
      if (raw.competitionId) {
        try {
          const standRes = await matchService.standings(id);
          setStandings(standRes.standings || []);
        } catch {
          setStandings([]);
        }
      }
    } catch (err) {
      console.error('Failed to load match:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (match?.status !== 'LIVE') return;
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [match?.status, load]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Link
          to="/matches"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </Link>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <MatchSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Link
          to="/matches"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </Link>
        <div className="es-card p-12 text-center">
          <p className="text-[var(--color-text-muted)] text-lg">
            Match not found.
          </p>
        </div>
      </div>
    );
  }

  const isLive = match.status === 'LIVE';
  const statusLabel = isLive ? 'LIVE' : match.status === 'FINISHED' ? 'FT' : match.status === 'SCHEDULED' ? 'UPCOMING' : match.status;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'lineups', label: 'Lineups' },
    { key: 'events', label: 'Events' },
    { key: 'statistics', label: 'Statistics' },
    { key: 'table', label: 'Table' },
  ];

  const venue = match.venue || 'TBD';
  const referee = match.referee || 'TBD';
  const dateStr = match.date ? new Date(match.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'TBD';
  // `timeField` is authoritative, but a match saved without the time input has
  // null there while `date` still holds the real kickoff instant.
  const kickoff = match.timeField || (match.date ? new Date(match.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'TBD');
  const attendance = match.attendance || 'TBD';
  const competition = match.competition?.name || match.competition || 'TBD';
  const round = match.round || (match.roundNumber ? `Round ${match.roundNumber}` : 'TBD');
  const season = match.season || 'TBD';

  const formatMinute = (minute) => {
    if (!minute && minute !== 0) return '';
    if (minute === 45 && match.addedTime) {
      return `45+${match.addedTime}'`;
    }
    if (minute === 90 && match.addedTimeSecond) {
      return `90+${match.addedTimeSecond}'`;
    }
    return `${minute}'`;
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[
        { label: 'Venue', value: venue },
        { label: 'Referee', value: referee },
        { label: 'Date', value: dateStr },
        { label: 'Kickoff', value: kickoff },
        { label: 'Attendance', value: attendance },
        { label: 'Competition', value: competition },
        { label: 'Season', value: season },
        { label: 'Round', value: round },
      ].map((item) => (
        <div key={item.label} className="es-card p-4">
          <span className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
            {item.label}
          </span>
          <span className="block text-sm font-medium text-[var(--color-text)]">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );

  const renderLineups = () => {
    const bySide = (side) => (lineups || []).find((l) => l.side === side);
    const home = bySide("HOME");
    const away = bySide("AWAY");

    if (!home && !away) {
      return (
        <div className="es-card p-8 text-center text-[var(--color-text-muted)]">
          Lineups not available.
        </div>
      );
    }

    const nameOf = (p) => (typeof p === "object" && p !== null ? p.name || "" : String(p || ""));
    const positionOf = (p) => (typeof p === "object" && p !== null ? p.position || "" : "");

    const renderTeam = (lineup, teamName) => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-[var(--color-text)]">
            {teamName} XI
          </h3>
          {lineup?.formation && (
            <span className="badge-muted text-xs px-2 py-0.5">{lineup.formation}</span>
          )}
        </div>
        <div className="es-card p-4 space-y-2">
          {(lineup?.startingXI || []).length > 0 ? (
            lineup.startingXI.map((player, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[var(--color-green-dim)] text-[10px] flex items-center justify-center font-semibold text-[var(--color-green)]">
                    {i + 1}
                  </span>
                  <span className="text-[var(--color-text)]">{nameOf(player)}</span>
                </span>
                {positionOf(player) && (
                  <span className="text-[var(--color-text-muted)] text-xs">
                    {positionOf(player)}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-[var(--color-text-muted)]">Not available</div>
          )}
        </div>
        {(lineup?.substitutes || []).length > 0 && (
          <>
            <h3 className="font-display text-base font-semibold text-[var(--color-text-secondary)]">
              Substitutes
            </h3>
            <div className="es-card p-4 space-y-2">
              {lineup.substitutes.map((player, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-secondary)]">{nameOf(player)}</span>
                  {positionOf(player) && (
                    <span className="text-[var(--color-text-muted)] text-xs">
                      {positionOf(player)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderTeam(home, match.homeTeam)}
        {renderTeam(away, match.awayTeam)}
      </div>
    );
  };

  const renderEvents = () => {
    if (!events || events.length === 0) {
      return (
        <div className="es-card p-8 text-center text-[var(--color-text-muted)]">
          No events recorded.
        </div>
      );
    }

    const EVENT_META = {
      GOAL: { icon: "⚽", label: "Goal" },
      OWN_GOAL: { icon: "⚽", label: "Own Goal" },
      PENALTY: { icon: "⚽", label: "Penalty" },
      YELLOW_CARD: { icon: "🟨", label: "Yellow Card" },
      RED_CARD: { icon: "🟥", label: "Red Card" },
      SUBSTITUTION: { icon: "🔄", label: "Substitution" },
    };

    const sorted = [...events].sort(
      (a, b) => (a.minute ?? 0) - (b.minute ?? 0)
    );

    return (
      <div className="es-card p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {sorted.map((event, i) => {
          const meta = EVENT_META[event.type] || { icon: "•", label: event.type };
          const playerLine =
            event.playerName ||
            (event.type === "SUBSTITUTION" ? event.playerIn || "—" : meta.label);
          const detailParts = [];
          if (event.assist) detailParts.push(`Assist: ${event.assist}`);
          if (event.type === "SUBSTITUTION") {
            if (event.playerIn) detailParts.push(`IN: ${event.playerIn}`);
            if (event.playerOut) detailParts.push(`OUT: ${event.playerOut}`);
          }
          detailParts.push(meta.label);
          return (
            <div
              key={event.id ?? i}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-black/[0.03] transition-colors"
            >
              <span className="w-12 text-right font-mono text-sm font-bold text-[var(--color-green)] shrink-0">
                {formatMinute(event.minute)}
              </span>
              <span className="shrink-0">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text)]">{playerLine}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {detailParts.join(" · ")}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-[var(--color-text-muted)] shrink-0 uppercase tracking-wide">
                {event.side === "AWAY" ? match.awayTeam : match.homeTeam}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStatistics = () => {
    if (!statistics) {
      return (
        <div className="es-card p-8 text-center text-[var(--color-text-muted)]">
          Statistics not available.
        </div>
      );
    }

    const hasPossession =
      statistics.possession !== null &&
      statistics.possession !== undefined &&
      !Number.isNaN(Number(statistics.possession));
    const possession = hasPossession ? Number(statistics.possession) : 0;

    const tiles = [
      ["Shots", statistics.shots],
      ["Shots on Target", statistics.shotsOnTarget],
      ["Corners", statistics.corners],
      ["Fouls", statistics.fouls],
      ["Offsides", statistics.offside],
      ["Saves", statistics.saves],
      ["Passes", statistics.passes],
      ["Yellow Cards", statistics.yellowCards],
      ["Red Cards", statistics.redCards],
    ].filter(([, value]) => value !== null && value !== undefined);

    return (
      <div className="space-y-6">
        {hasPossession && (
          <div className="es-card p-6">
            <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-3 text-center">
              Possession
            </div>
            <PossessionBar home={possession} away={Math.max(0, 100 - possession)} />
          </div>
        )}
        {tiles.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tiles.map(([label, value]) => (
              <div key={label} className="es-card p-4 text-center">
                <div className="text-xl font-display font-bold text-[var(--color-text)]">
                  {value}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="es-card p-8 text-center text-[var(--color-text-muted)]">
            No statistics recorded.
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (standings.length === 0) {
      return (
        <div className="es-card p-8 text-center text-[var(--color-text-muted)]">
          Standings not available.
        </div>
      );
    }

    return (
      <div className="es-card-static overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <th className="py-3 px-4 text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                #
              </th>
              <th className="py-3 px-4 text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                Team
              </th>
              <th className="py-3 px-4 text-center text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                P
              </th>
              <th className="py-3 px-4 text-center text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                W
              </th>
              <th className="py-3 px-4 text-center text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                D
              </th>
              <th className="py-3 px-4 text-center text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                L
              </th>
              <th className="py-3 px-4 text-center text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                GD
              </th>
              <th className="py-3 px-4 text-center text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                PTS
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr
                key={row.teamId ?? i}
                className="border-b border-black/5 hover:bg-black/[0.03] transition-colors"
              >
                <td className="py-3 px-4 text-[var(--color-text-muted)]">
                  {row.rank ?? i + 1}
                </td>
                <td className="py-3 px-4 text-[var(--color-text)] font-medium">
                  {row.team}
                </td>
                <td className="py-3 px-4 text-center text-[var(--color-text-secondary)]">
                  {row.played}
                </td>
                <td className="py-3 px-4 text-center text-[var(--color-text-secondary)]">
                  {row.won}
                </td>
                <td className="py-3 px-4 text-center text-[var(--color-text-secondary)]">
                  {row.drawn}
                </td>
                <td className="py-3 px-4 text-center text-[var(--color-text-secondary)]">
                  {row.lost}
                </td>
                <td className="py-3 px-4 text-center text-[var(--color-text-secondary)]">
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[var(--color-text)]">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'lineups':
        return renderLineups();
      case 'events':
        return renderEvents();
      case 'statistics':
        return renderStatistics();
      case 'table':
        return renderTable();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Link
        to="/matches"
        className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Back</span>
      </Link>

      <div className="es-card-static p-6 text-center section-vignette relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          {match.competition && (
            <span className="inline-block badge px-3 py-1 text-xs font-medium rounded-full">
              {match.competition}
            </span>
          )}

          {isLive && (
            <span className="tag-live inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full">
              <span className="live-dot w-2 h-2 rounded-full bg-[var(--color-red)]" />
              LIVE
            </span>
          )}

          {match.status === 'FINISHED' && (
            <span className="tag-ft inline-block px-3 py-1 text-xs font-bold rounded-full">
              FT
            </span>
          )}

          {match.status === 'SCHEDULED' && (
            <span className="tag-upcoming inline-block px-3 py-1 text-xs font-bold rounded-full">
              UPCOMING
            </span>
          )}

          {(match.status === 'POSTPONED' || match.status === 'CANCELLED') && (
            <span className="tag-ft inline-block px-3 py-1 text-xs font-bold rounded-full">
              {match.status}
            </span>
          )}

          <div className="flex items-center justify-center gap-8 sm:gap-12">
            <div className="flex flex-col items-center gap-3">
              <div className="hero-team-logo w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/5 flex items-center justify-center text-2xl sm:text-3xl font-display font-bold text-[var(--color-text)]">
                {match.homeTeam?.charAt(0) || 'H'}
              </div>
              <span className="font-display text-base sm:text-lg font-bold text-[var(--color-text)]">
                {match.homeTeam}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span
                className={`score-display score-display-lg ${
                  isLive ? 'glow-green' : ''
                } text-4xl sm:text-5xl font-display font-black text-[var(--color-text)]`}
              >
                {match.homeScore} - {match.awayScore}
              </span>
              {match.minute != null && (isLive || match.status === 'FINISHED') && (
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-mono font-bold ${
                    isLive ? 'text-[var(--color-red)]' : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {isLive && <span className="live-dot w-1.5 h-1.5 rounded-full bg-[var(--color-red)]" />}
                  {formatMinute(match.minute)}
                  {match.phase === 'ET' && <span className="px-1 rounded bg-black/5 text-[10px]">ET</span>}
                  {match.phase === 'PENS' && <span className="px-1 rounded bg-black/5 text-[10px]">PENS</span>}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="hero-team-logo w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/5 flex items-center justify-center text-2xl sm:text-3xl font-display font-bold text-[var(--color-text)]">
                {match.awayTeam?.charAt(0) || 'A'}
              </div>
              <span className="font-display text-base sm:text-lg font-bold text-[var(--color-text)]">
                {match.awayTeam}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-[var(--color-text-muted)]">
            {match.date && <span>{dateStr}</span>}
            {kickoff && <span>{kickoff}</span>}
            {match.venue && <span>{match.venue}</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--color-green)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">{renderTabContent()}</div>
    </div>
  );
}
