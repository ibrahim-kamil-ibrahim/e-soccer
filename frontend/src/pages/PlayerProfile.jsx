import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { playerService } from "../services/playerService.js"
import { ArrowLeft } from "lucide-react"

function matchesTeamName(a, b) {
  if (!a || !b) return false
  const norm = (s) => s.replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase().trim()
  return a === b || norm(a).includes(norm(b)) || norm(b).includes(norm(a))
}

export default function PlayerProfile({ setSearchOpen, favorites, setFavorites }) {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    playerService.get(id).then((res) => {
      if (res.success) {
        setPlayer(res.player);
      }
      setLoading(false);
    });
  }, [id])

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Link
          to="/players"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </Link>
        <div className="es-card p-12 text-center">
          <p className="text-[var(--color-text-muted)] text-lg">Loading player...</p>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Link
          to="/players"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </Link>
        <div className="es-card p-12 text-center">
          <p className="text-[var(--color-text-muted)] text-lg">Player not found.</p>
        </div>
      </div>
    )
  }

  const teamName = player.team?.name || ""
  const playerTeam = player.team
  const allMatches = [...(playerTeam?.homeMatches || []), ...(playerTeam?.awayMatches || [])]
  const playerMatches = allMatches.sort((a, b) => new Date(b.date) - new Date(a.date))

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "statistics", label: "Statistics" },
    { key: "matches", label: "Matches" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Link
        to="/players"
        className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Back</span>
      </Link>

      {/* Header */}
      <div className="es-card-static p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-2xl bg-[var(--color-green-dim)] border border-[var(--color-border)] flex items-center justify-center text-3xl font-bold text-[var(--color-green)] shrink-0">
          {player.name.charAt(0)}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">{player.name}</h1>
          <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
            <span className="badge badge-green">{player.position}</span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">{teamName}</p>
          <div className="flex items-center justify-center sm:justify-start gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
            <span>{player.age} years</span>
            <span>{player.nationality}</span>
            <span>{player.height}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Goals", value: player.goals },
          { label: "Assists", value: player.assists },
          { label: "Matches", value: player.matches },
          { label: "Minutes", value: `${player.minutesPlayed}'` },
        ].map((s, i) => (
          <div key={i} className="es-card p-4 text-center">
            <p className="font-display font-extrabold text-2xl text-[var(--color-text)]">{s.value}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
              activeTab === tab.key
                ? "bg-[var(--color-green)] text-white"
                : "text-[var(--color-text-secondary)] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "overview" && (
          <div className="es-card-static p-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Position", value: player.position },
                { label: "Team", value: teamName },
                { label: "Age", value: player.age },
                { label: "Nationality", value: player.nationality },
                { label: "Height", value: player.height },
                { label: "Goals", value: player.goals },
                { label: "Assists", value: player.assists },
                { label: "Yellow Cards", value: player.yellowCards },
                { label: "Red Cards", value: player.redCards },
              ].map((item) => (
                <div key={item.label} className="p-4">
                  <span className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                    {item.label}
                  </span>
                  <span className="block text-sm font-medium text-[var(--color-text)]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "statistics" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Goals", value: player.goals },
              { label: "Assists", value: player.assists },
              { label: "Matches", value: player.matches },
              { label: "Minutes", value: player.minutesPlayed },
              { label: "Yellow Cards", value: player.yellowCards },
              { label: "Red Cards", value: player.redCards },
            ].map((s, i) => (
              <div key={i} className="es-card p-4">
                <p className="font-display font-extrabold text-xl text-[var(--color-text)]">{s.value}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "matches" && (
          <div className="space-y-3">
            {playerMatches.length > 0 ? (
              playerMatches.map((m) => {
                const homeTeamName = m.homeTeam?.name || m.homeTeam
                const awayTeamName = m.awayTeam?.name || m.awayTeam
                const isHome = matchesTeamName(homeTeamName, teamName)
                const opponent = isHome ? awayTeamName : homeTeamName
                const result =
                  m.homeScore != null && m.awayScore != null
                    ? isHome
                      ? m.homeScore > m.awayScore
                        ? "W"
                        : m.homeScore < m.awayScore
                          ? "L"
                          : "D"
                      : m.awayScore > m.homeScore
                        ? "W"
                        : m.awayScore < m.homeScore
                          ? "L"
                          : "D"
                    : null
                return (
                  <Link key={m.id} to={`/match/${m.id}`}>
                    <div className="es-card p-3 flex items-center justify-between hover:border-[var(--color-border-strong)] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--color-text-muted)]">{m.date}</span>
                        <span className="text-sm text-[var(--color-text)]">{opponent}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {isHome ? "(H)" : "(A)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-[var(--color-text)] score-display">
                          {m.homeScore} – {m.awayScore}
                        </span>
                        {result && (
                          <span
                            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                              result === "W"
                                ? "bg-[var(--color-green-dim)] text-[var(--color-green-light)]"
                                : result === "L"
                                  ? "bg-[var(--color-red-dim)] text-[var(--color-red)]"
                                  : "bg-black/5 text-[var(--color-text-secondary)]"
                            }`}
                          >
                            {result}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="es-card p-8 text-center text-[var(--color-text-muted)]">
                No matches found for this player's team.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
