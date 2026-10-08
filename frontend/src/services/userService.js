import { api } from "./api.js";

export const userService = {
  list: (params) => api.get("/users", params),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
  removeMany: (ids) => api.post("/users/bulk", { ids }),
};