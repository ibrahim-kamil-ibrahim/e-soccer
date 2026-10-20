import { api } from "./api.js";

export const competitionService = {
  list: (params) => api.get("/competitions", params),
  get: (id) => api.get(`/competitions/${id}`),
  create: (data) => api.post("/competitions", data),
  update: (id, data) => api.put(`/competitions/${id}`, data),
  remove: (id) => api.delete(`/competitions/${id}`),
  removeMany: (ids) => api.post("/competitions/bulk", { ids }),
  bracket: (id) => api.get(`/competitions/${id}/bracket`),
  generateBracket: (id, data) => api.post(`/competitions/${id}/bracket`, data),
};