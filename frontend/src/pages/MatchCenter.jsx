import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchService } from '../services/matchService.js';
import { PossessionBar, StatsRow } from '../components/common/Cards.jsx';
import { MatchSkeleton, EmptyState } from '../components/common/LoadingSkeletons.jsx';
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

  useEffect(() => {
    async function fetchMatch() {
      try {
        const res = await matchService.get(id);
        const raw = res.match || res;
        setMatch(mapMatch(raw));
        setEvents((raw.events || []).map((e) => ({
          ...e,
          type: e.type === 'yellow_card' ? 'yellowCard' : e.type === 'red_card' ? 'redCard' : e.type,
        })));
        setStatistics(raw.statistics || null);
        setLineups(raw.lineups || null);
        setStandings(raw.standings || []);
      } catch (err) {
        console.error('Failed to load match:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMatch();
  }, [id]);

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
  const statusLabel = isLive ? 'LIVE' : match.status === 'FT' ? 'FT' : match.status;

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
  const kickoff = match.timeField || match.time || 'TBD';
  const attendance = match.attendance || 'TBD';
  const competition = match.competition?.name || match.competition || 'TBD';

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
    if (!lineups) {
      return (
        <div className="es-card p-8 text-center text-[var(--color-text-muted)]">
          Lineups not available.
        </div>
      );
    }

    const renderTeam = (teamData, side) => (
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold text-[var(--color-text)]">
          {side} XI
        </h3>
        <div className="es-card p-4 space-y-3">
          {(teamData.starting || []).map((player, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-[var(--color-text)]">{player.name}</span>
              <span className="text-[var(--color-text-muted)] text-xs">
                {player.position}
              </span>
            </div>
          ))}
        </div>
        {teamData.substitutes && teamData.substitutes.length > 0 && (
          <>
            <h3 className="font-display text-base font-semibold text-[var(--color-text-secondary)]">
              Substitutes
            </h3>
            <div className="es-card p-4 space-y-3">
              {teamData.substitutes.map((player, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-[var(--color-text-secondary)]">
                    {player.name}
                  </span>
                  <span className="text-[var(--color-text-muted)] text-xs">
                    {player.position}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderTeam(lineups.home || {}, match.homeTeam)}
        {renderTeam(lineups.away || {}, match.awayTeam)}
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

    const getEventIcon = (type) => {
      switch (type) {
        case 'goal':
          return <span className="text-[var(--color-green)] font-bold">⚽</span>;
        case 'yellowCard':
          return <span className="text-yellow-400">🟨</span>;
        case 'redCard':
          return <span className="text-[var(--color-red)]">🟥</span>;
        case 'substitution':
          return <span className="text-blue-400">🔄</span>;
        default:
          return <span className="text-[var(--color-text-muted)]">•</span>;
      }
    };

    return (
      <div className="es-card p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {events.map((event, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-black/[0.03] transition-colors"
          >
            <span className="w-12 text-right font-mono text-sm font-bold text-[var(--color-green)] shrink-0">
              {formatMinute(event.minute)}
            </span>
            <span className="shrink-0">{getEventIcon(event.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-text)]">{event.description}</p>
              {event.player && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {event.player}
                </p>
              )}
            </div>
            <span className="text-xs text-[var(--color-text-muted)] shrink-0">
              {event.team}
            </span>
          </div>
        ))}
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

    const possession = statistics.possession || 50;
    const stats = [
      { label: 'Shots on Target', home: statistics.shotsOnTarget?.home || 0, away: statistics.shotsOnTarget?.away || 0 },
      { label: 'Shots off Target', home: statistics.shotsOffTarget?.home || 0, away: statistics.shotsOffTarget?.away || 0 },
      { label: 'Fouls', home: statistics.fouls?.home || 0, away: statistics.fouls?.away || 0 },
      { label: 'Corners', home: statistics.corners?.home || 0, away: statistics.corners?.away || 0 },
      { label: 'Offsides', home: statistics.offsides?.home || 0, away: statistics.offsides?.away || 0 },
      { label: 'Saves', home: statistics.saves?.home || 0, away: statistics.saves?.away || 0 },
      { label: 'Pass Accuracy', home: statistics.passAccuracy?.home || 0, away: statistics.passAccuracy?.away || 0 },
      { label: 'Tackles', home: statistics.tackles?.home || 0, away: statistics.tackles?.away || 0 },
    ];

    return (
      <div className="space-y-6">
        <div className="es-card p-6">
          <PossessionBar
            home={typeof possession === 'object' ? possession.home : possession}
            away={typeof possession === 'object' ? possession.away : 100 - possession}
            homeLabel={match.homeTeam}
            awayLabel={match.awayTeam}
          />
        </div>
        <div className="space-y-3">
          {stats.map((stat) => (
            <StatsRow
              key={stat.label}
              label={stat.label}
              home={stat.home}
              away={stat.away}
            />
          ))}
        </div>
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
                key={i}
                className="border-b border-black/5 hover:bg-black/[0.03] transition-colors"
              >
                <td className="py-3 px-4 text-[var(--color-text-muted)]">
                  {row.position}
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

          {match.status === 'FT' && (
            <span className="tag-ft inline-block px-3 py-1 text-xs font-bold rounded-full">
              FT
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
            {match.date && <span>{match.date}</span>}
            {kickoff && <span>{kickoff}</span>}
            {match.venue && <span>{match.venue}</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
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
