import { api } from "./api.js";

export const teamService = {
  list: (params) => api.get("/teams", params),
  get: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post("/teams", data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  remove: (id) => api.delete(`/teams/${id}`),
  removeMany: (ids) => api.post("/teams/bulk", { ids }),
};