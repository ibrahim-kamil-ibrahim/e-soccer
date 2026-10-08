import { api } from "./api.js";

export const settingsService = {
  get: () => api.get("/settings"),
  update: (settings) => api.put("/settings", settings),
  getHomepage: () => api.get("/settings/homepage"),
  updateHomepage: (homepage) => api.put("/settings/homepage", homepage),
};