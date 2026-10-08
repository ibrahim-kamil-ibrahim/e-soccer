import { api } from "./api.js";

export const mediaService = {
  list: (params) => api.get("/media", params),
  upload: (file, category) => {
    const fd = new FormData();
    fd.append("file", file);
    if (category) fd.append("category", category);
    return api.upload("/media", fd);
  },
  remove: (id) => api.delete(`/media/${id}`),
  removeMany: (ids) => api.post("/media/bulk", { ids }),
};