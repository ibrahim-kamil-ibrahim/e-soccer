import { api } from "./api.js";

export const cityService = {
  list: (params) => api.get("/cities", params),
  all: () => api.get("/cities/all"),
  hierarchy: () => api.get("/cities/hierarchy"),
  subcities: (params) => api.get("/cities/subcities", params),
  woredas: (params) => api.get("/cities/woredas", params),
  kebeles: (params) => api.get("/cities/kebeles", params),
  get: (id) => api.get(`/cities/${id}`),
  create: (data) => api.post("/cities", data),
  update: (id, data) => api.put(`/cities/${id}`, data),
  remove: (id) => api.delete(`/cities/${id}`),
  removeMany: (ids) => api.post("/cities/bulk", { ids }),
};
