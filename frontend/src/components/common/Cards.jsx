import { Link } from "react-router-dom";
import { getStatusLabel, formatDate } from "../../utils/helpers.js";

export function TeamCard({ team }) {
  return (
    <Link to={`/teams/${team.id}`}>
      <div className="es-card p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl bg-[var(--color-green-dim)] border border-[var(--color-green)]/10">
          {team.logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-[var(--color-text)] truncate">{team.name}</div>
          <div className="text-xs text-[var(--color-text-muted)]">{team.city}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[10px] badge-outline">{team.competition?.name || team.competition || ''}</span>
          <div className="flex gap-0.5">
            {team.form &&
              team.form.split("-").map((char, i) => (
                <span
                  key={i}
                  className={`w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-bold ${
                    char === "W"
                      ? "form-pill-w"
                      : char === "D"
                        ? "form-pill-d"
                        : "form-pill-l"
                  }`}
                >
                  {char}
                </span>
              ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PlayerCard({ player }) {
  return (
    <Link to={`/players/${player.id}`}>
      <div className="es-card p-4 flex items-center gap-3">
        {player.photo ? (
          <img src={player.photo} alt={player.name} className="w-11 h-11 rounded-xl object-cover border border-[var(--color-green)]/10" />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-[var(--color-green-dim)] border border-[var(--color-green)]/10 flex items-center justify-center text-sm font-bold text-[var(--color-green)]">
            {player.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-[var(--color-text)] truncate">{player.name}</div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {player.position} · {player.team}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-[var(--color-green)]">{player.goals}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Goals</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-[var(--color-green)]">{player.assists}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Assists</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function CompetitionCard({ competition }) {
  return (
    <Link to={`/competitions/${competition.id}`}>
      <div className="es-card p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[var(--color-green-dim)] border border-[var(--color-green)]/10 flex items-center justify-center text-xl">
          {competition.logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-[var(--color-text)] truncate">{competition.name}</div>
          <div className="text-xs text-[var(--color-text-muted)]">{competition.region}</div>
        </div>
        <div className="flex gap-1.5">
          <span className="badge-muted text-[10px]">{competition._count?.teams ?? competition.teams ?? 0} Teams</span>
          <span
            className={`text-[10px] ${
              competition.level?.includes("Top") ? "badge-green" : "badge-muted"
            }`}
          >
            {competition.level}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function NewsCard({ article }) {
  return (
    <Link to={`/news/${article.id}`}>
      <div className="es-card overflow-hidden">
        <div className="h-36 bg-gradient-to-br from-[var(--color-green)]/10 to-[var(--color-surface-dim)] flex items-center justify-center text-4xl">
          {article.image}
        </div>
        <div className="p-4">
          <span className="badge-green text-[10px] uppercase">{article.category}</span>
          <div className="font-semibold text-sm text-[var(--color-text)] line-clamp-2 mt-2">{article.title}</div>
          <div className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mt-1.5">
            {article.summary}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-3">{article.date}</div>
        </div>
      </div>
    </Link>
  );
}

export function MatchCard({ match }) {
  return (
    <Link to={`/match/${match.id}`}>
      <div className="es-card p-4">
        <div className="flex items-center justify-between mb-3">
          {match.status === "LIVE" ? (
            <span className="tag-live inline-flex items-center gap-1.5">
              <span className="live-dot" />
              LIVE{match.minute != null ? ` ${match.minute}` : ""}
            </span>
          ) : match.status === "FINISHED" ? (
            <span className="tag-ft">FT</span>
          ) : (
            <span className={`tag-upcoming ${match.status === "CANCELLED" ? "tag-ft" : ""}`}>{getStatusLabel(match.status)}</span>
          )}
          <span className="text-xs text-[var(--color-text-secondary)]">
            {match.competition?.name || match.competition}
          </span>
        </div>
        <div className="flex items-center">
          <div className="flex-1 text-right flex items-center justify-end gap-2.5">
            <span className="text-sm font-medium text-[var(--color-text)]">{match.homeTeam?.name || match.homeTeam}</span>
            <div className="w-9 h-9 rounded-lg bg-[var(--color-green-dim)] border border-[var(--color-green)]/10 flex items-center justify-center text-lg">
              {match.homeTeam?.logo || match.homeLogo}
            </div>
          </div>
          <div className="font-display font-extrabold text-lg text-[var(--color-text)] mx-3">
            {match.homeScore == null || match.awayScore == null ? (
              <span className="text-xs text-[var(--color-text-muted)] font-normal">VS</span>
            ) : (
              <>
                {match.homeScore}
                <span className="mx-1 text-[var(--color-text-muted)]">–</span>
                {match.awayScore}
              </>
            )}
          </div>
          <div className="flex-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-green-dim)] border border-[var(--color-green)]/10 flex items-center justify-center text-lg">
              {match.awayTeam?.logo || match.awayLogo}
            </div>
            <span className="text-sm font-medium text-[var(--color-text)]">{match.awayTeam?.name || match.awayTeam}</span>
          </div>
        </div>
        <div className="text-[10px] text-[var(--color-text-muted)] text-center mt-3">
          {match.date ? formatDate(match.date) : ""} · {match.timeField || match.time || ""}
        </div>
      </div>
    </Link>
  );
}

export function LiveMatchCard({ match }) {
  return (
    <Link to={`/match/${match.id}`}>
      <div className="es-card p-4 live-bar shadow-glow-green">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 badge-red text-[10px] px-2 py-0.5">
            <span className="live-dot" />
            LIVE {match.minute}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {match.competition?.name || match.competition}
          </span>
        </div>
        <div className="flex items-center">
          <div className="flex-1 text-right flex items-center justify-end gap-2.5">
            <span className="text-sm font-medium text-[var(--color-text)]">{match.homeTeam?.name || match.homeTeam}</span>
            <div className="w-9 h-9 rounded-lg bg-[var(--color-green-dim)] border border-[var(--color-green)]/10 flex items-center justify-center text-lg">
              {match.homeTeam?.logo || match.homeLogo}
            </div>
          </div>
          <div className="font-display font-extrabold text-xl text-[var(--color-green)] mx-3 glow-green">
            {match.homeScore}
            <span className="mx-1 text-[var(--color-text-muted)]">–</span>
            {match.awayScore}
          </div>
          <div className="flex-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-green-dim)] border border-[var(--color-green)]/10 flex items-center justify-center text-lg">
              {match.awayTeam?.logo || match.awayLogo}
            </div>
            <span className="text-sm font-medium text-[var(--color-text)]">{match.awayTeam?.name || match.awayTeam}</span>
          </div>
        </div>
        <div className="text-xs text-[var(--color-red)] font-medium text-center mt-3">
          {match.competition?.name || match.competition}
        </div>
      </div>
    </Link>
  );
}

export function UpcomingMatchCard({ match }) {
  return (
    <Link to={`/match/${match.id}`}>
      <div className="es-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="badge-muted text-[10px]">{match.date}</span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {match.competition?.name || match.competition}
          </span>
        </div>
        <div className="flex items-center">
          <div className="flex-1 text-right flex items-center justify-end gap-2.5">
            <span className="text-sm font-medium text-[var(--color-text)]">{match.homeTeam?.name || match.homeTeam}</span>
            <div className="w-9 h-9 rounded-lg bg-[var(--color-green-dim)] border border-[var(--color-green)]/10 flex items-center justify-center text-lg">
              {match.homeTeam?.logo || match.homeLogo}
            </div>
          </div>
          <div className="font-display font-extrabold text-lg text-[var(--color-text)] mx-3">
            <span className="text-xs text-[var(--color-text-muted)] font-normal">VS</span>
          </div>
          <div className="flex-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-green-dim)] border border-[var(--color-green)]/10 flex items-center justify-center text-lg">
              {match.awayTeam?.logo || match.awayLogo}
            </div>
            <span className="text-sm font-medium text-[var(--color-text)]">{match.awayTeam?.name || match.awayTeam}</span>
          </div>
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] text-center mt-3">
          {match.time}
        </div>
      </div>
    </Link>
  );
}

export function ScoreDisplay({ homeScore, awayScore, status }) {
  return (
    <span className="font-display font-extrabold text-[var(--color-text)]">
      {homeScore}
      <span className="score-divider mx-1">–</span>
      {awayScore}
    </span>
  );
}

export function PossessionBar({ home, away }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-[var(--color-green)] font-semibold w-8 text-right">{home}%</span>
      <div className="flex-1 h-1.5 rounded-full bg-black/[0.04]">
        <div
          className="h-full rounded-full bg-[var(--color-green)]"
          style={{ width: `${home}%` }}
        />
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-black/[0.04]">
        <div
          className="h-full rounded-full bg-[var(--color-text-muted)]"
          style={{ width: `${away}%` }}
        />
      </div>
      <span className="text-[var(--color-text-muted)] font-semibold w-8">{away}%</span>
    </div>
  );
}

export function StatsRow({ label, home, away }) {
  return (
    <div className="flex items-center py-2.5 border-b border-black/[0.04]">
      <span className="w-12 text-right font-semibold text-sm text-[var(--color-text)]">{home}</span>
      <span className="flex-1 text-center text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="w-12 text-left font-semibold text-sm text-[var(--color-text)]">{away}</span>
    </div>
  );
}
