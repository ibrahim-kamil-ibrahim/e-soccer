import { useState, useMemo, useEffect } from "react"
import { playerService } from "../services/playerService.js"
import { PlayerCard } from "../components/common/Cards.jsx"
import { PlayerSkeleton, EmptyState, ErrorState } from "../components/common/LoadingSkeletons.jsx"
import { Search } from "lucide-react"

export default function Players({ setSearchOpen, favorites, setFavorites }) {
  const [players, setPlayers] = useState([])
  const [query, setQuery] = useState("")
  const [filterPosition, setFilterPosition] = useState("")
  const [filterTeam, setFilterTeam] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      try {
        const all = []
        let page = 1
        let pages = 1
        do {
          const res = await playerService.list({ page, limit: 100 })
          if (!res.success) break
          all.push(...res.items)
          pages = res.pagination?.pages || 1
          page += 1
        } while (page <= pages && !cancelled)
        if (!cancelled) setPlayers(all.map((p) => ({ ...p, team: p.team?.name || "" })))
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadAll()
    return () => {
      cancelled = true
    }
  }, [])

  const positions = useMemo(() => [...new Set(players.map((p) => p.position))], [players])
  const teamNames = useMemo(() => [...new Set(players.map((p) => p.team))], [players])

  const filtered = useMemo(() => {
    return players.filter((p) => {
      const matchQuery = p.name.toLowerCase().includes(query.toLowerCase())
      const matchPos = !filterPosition || p.position === filterPosition
      const matchTeam = !filterTeam || p.team === filterTeam
      return matchQuery && matchPos && matchTeam
    })
  }, [query, filterPosition, filterTeam, players])

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="section-vignette" />

      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">Players</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {filtered.length} players across all divisions
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            type="text"
            placeholder="Search players..."
            className="w-full bg-black/[0.03] border border-[var(--color-border)] rounded-xl pl-9 pr-4 py-2.5 text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-green)]/30 focus:outline-none transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select
          className="bg-black/[0.03] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-green)]/30 focus:outline-none transition-colors appearance-none cursor-pointer"
          value={filterPosition}
          onChange={(e) => setFilterPosition(e.target.value)}
        >
          <option value="">All Positions</option>
          {positions.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>

        <select
          className="bg-black/[0.03] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-green)]/30 focus:outline-none transition-colors appearance-none cursor-pointer"
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
        >
          <option value="">All Teams</option>
          {teamNames.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <PlayerSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load players"
          message="Something went wrong while fetching the player list. Please try again."
          onRetry={() => window.location.reload()}
        />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <PlayerCard key={p.id} player={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="⚽"
          title="No players found"
          description="Try adjusting your search or filters."
        />
      )}
    </div>
  )
}
