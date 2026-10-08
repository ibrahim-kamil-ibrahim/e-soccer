import { useState, useEffect } from "react"
import { getMatches, getMatchById as getMatchByIdFn } from "../data/matches.js"
import { getTeamById } from "../data/teams.js"
import { getPlayerById } from "../data/players.js"
import { getCompetitions } from "../data/competitions.js"
import { getNews } from "../data/news.js"

export function useMatches() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    try {
      const data = getMatches()
      if (!cancelled) {
        setMatches(data)
      }
    } catch (err) {
      if (!cancelled) {
        setError(err)
      }
    }
    setLoading(false)
    return () => { cancelled = true }
  }, [])

  return { matches, loading, error }
}

export function useTeam(teamId) {
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    try {
      const data = getTeamById(Number(teamId))
      if (!cancelled) setTeam(data)
    } catch {}
    setLoading(false)
    return () => { cancelled = true }
  }, [teamId])

  return { team, loading }
}

export function usePlayer(playerId) {
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    try {
      const data = getPlayerById(Number(playerId))
      if (!cancelled) setPlayer(data)
    } catch {}
    setLoading(false)
    return () => { cancelled = true }
  }, [playerId])

  return { player, loading }
}

export function useCompetitions() {
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    try {
      const data = getCompetitions()
      if (!cancelled) setCompetitions(data)
    } catch {}
    setLoading(false)
    return () => { cancelled = true }
  }, [])

  return { competitions, loading }
}

export function useNews() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    try {
      const data = getNews()
      if (!cancelled) setNews(data)
    } catch {}
    setLoading(false)
    return () => { cancelled = true }
  }, [])

  return { news, loading }
}

export function useMatch(id) {
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    try {
      const data = getMatchByIdFn(Number(id))
      if (!cancelled) setMatch(data)
    } catch {}
    setLoading(false)
    return () => { cancelled = true }
  }, [id])

  return { match, loading }
}