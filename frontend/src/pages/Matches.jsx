import { useState, useEffect, useMemo } from "react"
import { matchService } from "../services/matchService.js"
import { MatchCard, LiveMatchCard } from "../components/common/Cards.jsx"
import { MatchSkeleton, EmptyState } from "../components/common/LoadingSkeletons.jsx"
import { FilterBar } from "../components/common/SearchOverlay.jsx"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"

function mapMatch(m) {
  const d = m.date ? new Date(m.date) : null;
  return {
    ...m,
    homeTeam: m.homeTeam?.name || m.homeTeam,
    awayTeam: m.awayTeam?.name || m.awayTeam,
    homeLogo: m.homeTeam?.logo || m.homeLogo || "",
    awayLogo: m.awayTeam?.logo || m.awayLogo || "",
    competition: m.competition?.name || m.competition,
    date: d ? d.toISOString().split("T")[0] : m.date || '',
    dateDisplay: d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : '',
  }
}

export default function Matches({ setSearchOpen, favorites, setFavorites }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("all")
  const [dateNav, setDateNav] = useState(new Date().toISOString().split("T")[0])
  const [filters, setFilters] = useState({ competition: "", team: "" })

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await matchService.list({})
        setMatches((res.items || []).map(mapMatch))
      } catch (err) {
        console.error("Failed to load matches:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchMatches()
  }, [])

  const tabs = [
    { key: "all", label: "All" },
    { key: "live", label: "Live" },
    { key: "upcoming", label: "Upcoming" },
    { key: "finished", label: "Finished" },
  ]

  const competitions = [...new Set(matches.map((m) => m.competition).filter(Boolean))]
  const teamNames = [...new Set([...matches.map((m) => m.homeTeam), ...matches.map((m) => m.awayTeam)])].filter(Boolean)

  const filterOptions = [
    { key: "competition", label: "Competition", values: competitions },
    { key: "team", label: "Team", values: teamNames },
  ]

  const navigateDate = (offset) => {
    const d = new Date(dateNav + "T00:00:00")
    d.setDate(d.getDate() + offset)
    setDateNav(d.toISOString().split("T")[0])
  }

  const filtered = useMemo(() => {
    let result = matches

    if (tab === "live") result = result.filter((m) => m.isLive)
    if (tab === "upcoming") result = result.filter((m) => m.status === "UPCOMING")
    if (tab === "finished") result = result.filter((m) => m.isFinished)

    if (filters.competition) result = result.filter((m) => m.competition === filters.competition)
    if (filters.team) result = result.filter((m) => m.homeTeam === filters.team || m.awayTeam === filters.team)

    if (dateNav) {
      result = result.filter((m) => m.date === dateNav)
    }

    return result
  }, [tab, filters, dateNav, matches])

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">Matches</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-[var(--color-green)] text-white"
                : "bg-black/[0.03] text-[var(--color-text-secondary)] hover:bg-black/[0.05]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigateDate(-1)}
          className="p-2 rounded-lg bg-black/[0.03] text-[var(--color-text-secondary)] hover:bg-black/[0.05] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => setDateNav(new Date().toISOString().split("T")[0])}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/[0.03] text-[var(--color-text-secondary)] hover:bg-black/[0.05] transition-colors text-sm font-medium"
        >
          <Calendar size={14} />
          {new Date(dateNav + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </button>
        <button
          onClick={() => navigateDate(1)}
          className="p-2 rounded-lg bg-black/[0.03] text-[var(--color-text-secondary)] hover:bg-black/[0.05] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} options={filterOptions} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MatchSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((m) => (
            m.isLive ? <LiveMatchCard key={m.id} match={m} /> : <MatchCard key={m.id} match={m} />
          ))}
        </div>
      ) : (
        <EmptyState icon="⚽" title="No matches found" description="Try adjusting your filters or check back later." />
      )}
    </div>
  )
}
