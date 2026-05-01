import { tokenStorage } from "../auth/tokenStorage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

const unauthorizedListeners = new Set();

export function onUnauthorized(handler) {
  unauthorizedListeners.add(handler);
  return () => unauthorizedListeners.delete(handler);
}

function emitUnauthorized() {
  unauthorizedListeners.forEach((fn) => {
    try { fn(); } catch { /* ignore */ }
  });
}

function buildUrl(path, query) {
  if (!query) return path;
  const sp = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((v) => sp.append(key, v));
    } else {
      sp.append(key, value);
    }
  });
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function httpRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    query,
    headers: extraHeaders = {},
    signal: externalSignal,
    timeout = 15000,
    skipAuth = false,
    raw = false,
  } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = { ...extraHeaders };

  if (!isFormData && body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (!skipAuth) {
    const token = tokenStorage.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onExternalAbort);
  }
  const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;

  let res;
  try {
    res = await fetch(`${BASE_URL}${buildUrl(path, query)}`, {
      method,
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new ApiError("Превышено время ожидания запроса", 0, null);
    }
    throw new ApiError("Нет связи с сервером", 0, null);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
  }

  if (res.status === 401 && !skipAuth) {
    tokenStorage.clear();
    emitUnauthorized();
  }

  if (raw) return res;

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = payload?.message || payload?.error || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, payload);
  }

  return payload;
}

export const http = {
  get: (path, options) => httpRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => httpRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) => httpRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => httpRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => httpRequest(path, { ...options, method: "DELETE" }),
};
