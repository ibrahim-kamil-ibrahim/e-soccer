import { api } from "./api.js";

export const playerService = {
  list: (params) => api.get("/players", params),
  get: (id) => api.get(`/players/${id}`),
  create: (data) => api.post("/players", data),
  update: (id, data) => api.put(`/players/${id}`, data),
  remove: (id) => api.delete(`/players/${id}`),
  removeMany: (ids) => api.post("/players/bulk", { ids }),
};