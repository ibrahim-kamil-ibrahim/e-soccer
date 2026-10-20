const teams = {
  1: { name: "Dire Dawa City S.C.", logo: "🟢" },
  2: { name: "Legehare", logo: "🔵" },
  3: { name: "Taiwan", logo: "🔴" },
  4: { name: "Urji Qefira", logo: "🟡" },
  5: { name: "S/ Hibret", logo: "🟣" },
  6: { name: "Koten", logo: "🟠" },
  7: { name: "Dire Dawa Railway", logo: "⚙️" },
  8: { name: "Dire Dawa Textiles", logo: "🏭" },
  9: { name: "Dire Dawa Kenema FC", logo: "🟢" },
  10: { name: "Dire Dawa FC", logo: "🔵" },
  11: { name: "Dire Dawa SC", logo: "🟡" },
  12: { name: "Dire Dawa Rangers", logo: "🔴" },
  13: { name: "Dire Dawa Warriors", logo: "🟣" },
  14: { name: "Dire Dawa United", logo: "🔵" },
  15: { name: "Dire Dawa Youth", logo: "🟠" },
  16: { name: "Dire Dawa Academy", logo: "🏫" },
}

const matches = [
  {
    id: 1,
    competition: "Ethiopian Premier League",
    homeTeam: "Dire Dawa City S.C.",
    awayTeam: "Legehare",
    homeLogo: "🟢",
    awayLogo: "🔵",
    homeScore: 2,
    awayScore: 0,
    status: "FT",
    minute: 90,
    date: "2025-06-15",
    time: "16:00",
    venue: "Dire Dawa Stadium",
    referee: "Tesfaye Bekele",
    attendance: 15000,
    division: "Premier League",
    isLive: false,
    isFinished: true,
  },
  {
    id: 2,
    competition: "Dire Dawa Higher Division",
    homeTeam: "Taiwan",
    awayTeam: "Urji Qefira",
    homeLogo: "🔴",
    awayLogo: "🟡",
    homeScore: 1,
    awayScore: 1,
    status: "LIVE",
    minute: 67,
    date: "2025-06-19",
    time: "15:30",
    venue: "Taiwan Ground",
    referee: "Kebede Mesfin",
    attendance: 5000,
    division: "Higher Division",
    isLive: true,
    isFinished: false,
  },
  {
    id: 3,
    competition: "Dire Dawa Higher Division",
    homeTeam: "S/ Hibret",
    awayTeam: "Koten",
    homeLogo: "🟣",
    awayLogo: "🟠",
    homeScore: null,
    awayScore: null,
    status: "UPCOMING",
    minute: null,
    date: "2025-06-21",
    time: "15:00",
    venue: "Hibret Stadium",
    referee: null,
    attendance: null,
    division: "Higher Division",
    isLive: false,
    isFinished: false,
  },
  {
    id: 4,
    competition: "Dire Dawa Upper Division",
    homeTeam: "Dire Dawa Kenema FC",
    awayTeam: "Dire Dawa FC",
    homeLogo: "🟢",
    awayLogo: "🔵",
    homeScore: null,
    awayScore: null,
    status: "UPCOMING",
    minute: null,
    date: "2025-06-22",
    time: "16:00",
    venue: "Dire Dawa Stadium",
    referee: null,
    attendance: null,
    division: "Upper Division",
    isLive: false,
    isFinished: false,
  },
  {
    id: 5,
    competition: "Dire Dawa District Cup",
    homeTeam: "Dire Dawa Railway",
    awayTeam: "Dire Dawa Textiles",
    homeLogo: "⚙️",
    awayLogo: "🏭",
    homeScore: 2,
    awayScore: 1,
    status: "FT",
    minute: 90,
    date: "2025-06-14",
    time: "15:00",
    venue: "Railway Stadium",
    referee: "Abera Girma",
    attendance: 6000,
    division: "Higher Division",
    isLive: false,
    isFinished: true,
  },
  {
    id: 6,
    competition: "Dire Dawa Lower Division",
    homeTeam: "Dire Dawa Stars",
    awayTeam: "Dire Dawa Phoenix",
    homeLogo: "⭐",
    awayLogo: "🔥",
    homeScore: 3,
    awayScore: 0,
    status: "FT",
    minute: 90,
    date: "2025-06-13",
    time: "14:00",
    venue: "Stars Ground",
    referee: "Samuel Tefera",
    attendance: 3000,
    division: "Lower Division",
    isLive: false,
    isFinished: true,
  },
  {
    id: 7,
    competition: "Dire Dawa Lower Division",
    homeTeam: "Dire Dawa Lions",
    awayTeam: "Dire Dawa Tigers",
    homeLogo: "🦁",
    awayLogo: "🐅",
    homeScore: null,
    awayScore: null,
    status: "UPCOMING",
    minute: null,
    date: "2025-06-24",
    time: "14:30",
    venue: "Lions Ground",
    referee: null,
    attendance: null,
    division: "Lower Division",
    isLive: false,
    isFinished: false,
  },
  {
    id: 8,
    competition: "Dire Dawa District Cup",
    homeTeam: "Legehare",
    awayTeam: "Dire Dawa City S.C.",
    homeLogo: "🔵",
    awayLogo: "🟢",
    homeScore: null,
    awayScore: null,
    status: "UPCOMING",
    minute: null,
    date: "2025-06-25",
    time: "16:00",
    venue: "Dire Dawa Stadium",
    referee: null,
    attendance: null,
    division: "Higher Division",
    isLive: false,
    isFinished: false,
  },
]

export const getMatches = () => matches
export const getMatchById = (id) => matches.find((m) => m.id === Number(id))

export function getTeamIdByName(name) {
  if (!name) return null;
  const entry = Object.entries(teams).find(([, t]) => t.name === name);
  return entry ? Number(entry[0]) : null;
}

export function getMatchEvents() {
  return [
    { id: 1, type: "goal", team: "home", player: "Musa Ahmed", minute: 34, assist: "Tadesse Bekele" },
    { id: 2, type: "goal", team: "away", player: "Yonas Fikru", minute: 67, assist: "Samuel Tefera" },
    { id: 3, type: "goal", team: "home", player: "Tadesse Bekele", minute: 78, assist: null },
    { id: 4, type: "yellow_card", team: "away", player: "Kebede Mesfin", minute: 45 },
    { id: 5, type: "substitution", team: "home", playerIn: "Bereket Desta", playerOut: "Girma Assefa", minute: 72 },
  ]
}

export function getMatchStatistics() {
  return {
    possession: { home: 58, away: 42 },
    shots: { home: 14, away: 9 },
    shotsOnTarget: { home: 6, away: 3 },
    corners: { home: 7, away: 4 },
    fouls: { home: 12, away: 15 },
    offside: { home: 2, away: 3 },
    saves: { home: 2, away: 5 },
    yellowCards: { home: 2, away: 3 },
    redCards: { home: 0, away: 0 },
  }
}

export function getMatchLineups() {
  return {
    home: { formation: "4-3-3", starting: ["Kebede Mesfin", "Girma Assefa", "Musa Ahmed", "Tadesse Bekele"], substitutes: ["Bereket Desta", "Yonas Fikru", "Samuel Tefera"] },
    away: { formation: "4-2-3-1", starting: ["Kebede Mesfin", "Samuel Tefera", "Yonas Fikru", "Abera Girma"], substitutes: ["Bereket Desta", "Musa Ahmed", "Tadesse Bekele"] },
  }
}

export function getTopScorers() {
  return [
    { rank: 1, player: "Musa Ahmed", team: "Dire Dawa City S.C.", goals: 18 },
    { rank: 2, player: "Yonas Fikru", team: "Dire Dawa Rangers", goals: 14 },
    { rank: 3, player: "Bereket Desta", team: "Dire Dawa Youth", goals: 11 },
    { rank: 4, player: "Tadesse Bekele", team: "Dire Dawa City S.C.", goals: 8 },
    { rank: 5, player: "Abera Girma", team: "Dire Dawa Warriors", goals: 6 },
  ]
}

export function getLiveMatches() {
  return matches.filter((m) => m.isLive)
}

export function getTodaysMatches() {
  return matches.filter((m) => m.date === "2025-06-19" || m.isLive)
}

export function getFinishedMatches() {
  return matches.filter((m) => m.isFinished)
}

export function getUpcomingMatches() {
  return matches.filter((m) => m.status === "UPCOMING")
}

export const services = {
  getMatches: () => Promise.resolve(matches),
  getMatchById: (id) => Promise.resolve(getMatchById(id)),
  getTeams: () => Promise.resolve([]),
  getTeamById: (id) => Promise.resolve(null),
  getPlayers: () => Promise.resolve([]),
  getPlayerById: (id) => Promise.resolve(null),
  getCompetitions: () => Promise.resolve([]),
  getNews: () => Promise.resolve([]),
}