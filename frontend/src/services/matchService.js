import { api } from "./api.js";

export const matchService = {
  list: (params) => api.get("/matches", params),
  get: (id) => api.get(`/matches/${id}`),
  create: (data) => api.post("/matches", data),
  update: (id, data) => api.put(`/matches/${id}`, data),
  remove: (id) => api.delete(`/matches/${id}`),
  removeMany: (ids) => api.post("/matches/bulk", { ids }),
};