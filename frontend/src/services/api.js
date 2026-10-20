const API_BASE = "/api";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let onUnauthorizedHandler = null;
let csrfToken = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorizedHandler = fn;
}

export function resetCsrfToken() {
  csrfToken = null;
}

export async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  try {
    const data = await fetch(`${API_BASE}/csrf-token`, {
      method: "GET",
      credentials: "include",
    }).then((r) => r.json());
    csrfToken = data.token || null;
  } catch {
    csrfToken = null;
  }
  return csrfToken;
}

export async function request(path, { method = "GET", body, params, headers = {} } = {}) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, v);
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }

  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  const isSafe = safeMethods.includes(method.toUpperCase());

  if (!isSafe) {
    const token = await getCsrfToken();
    if (token) {
      headers["x-csrf-token"] = token;
    }
  }

  const options = { method, headers: { ...headers }, credentials: "include" };
  if (body !== undefined) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new ApiError("Cannot reach the server. Make sure the backend is running.", 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    if (res.status === 401 && onUnauthorizedHandler) {
      onUnauthorizedHandler();
    }
    if (res.status === 403 && data?.message?.toLowerCase().includes("csrf")) {
      csrfToken = null;
    }
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data);
  }

  return data;
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  upload: (path, formData) => request(path, { method: "POST", body: formData }),
};

export default api;
