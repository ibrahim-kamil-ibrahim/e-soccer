import { api } from "./api.js";

export const dashboardService = {
  stats: () => api.get("/dashboard/stats"),
  recentMatches: () => api.get("/dashboard/recent-matches"),
  liveMatches: () => api.get("/dashboard/live-matches"),
  activity: (params) => api.get("/activity", params),
  standings: (competitionId) => api.get(`/dashboard/standings/${competitionId}`),
  topScorers: () => api.get("/dashboard/top-scorers"),
};