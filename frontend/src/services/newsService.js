import { api } from "./api.js";

export const newsService = {
  list: (params) => api.get("/news", params),
  get: (id) => api.get(`/news/${id}`),
  getBySlug: (slug) => api.get(`/news/slug/${slug}`),
  create: (data) => api.post("/news", data),
  update: (id, data) => api.put(`/news/${id}`, data),
  publish: (id) => api.post(`/news/${id}/publish`),
  unpublish: (id) => api.post(`/news/${id}/unpublish`),
  remove: (id) => api.delete(`/news/${id}`),
  removeMany: (ids) => api.post("/news/bulk", { ids }),
};