// src/services/api.ts
import { API_URL } from "../api/config";

const API_BASE_URL = API_URL;

let authSessionInvalidated = false;

export function invalidateAuthSession() {
  authSessionInvalidated = true;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T>;

export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<any>;

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  if (authSessionInvalidated) {
    throw new Error("AUTH_SESSION_INVALIDATED");
  }

  const token =
    localStorage.getItem("access_token") ??
    localStorage.getItem("token");

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.error("❌ API 401 Unauthorized", path);
    throw new Error("Unauthorized");
  }

  if (response.status === 403) {
    throw new Error("Forbidden");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP error ${response.status}`);
  }

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function apiDownload(
  path: string,
  filename: string,
  options: RequestInit = {}
): Promise<void> {
  if (authSessionInvalidated) {
    throw new Error("AUTH_SESSION_INVALIDATED");
  }

  const token =
    localStorage.getItem("access_token") ??
    localStorage.getItem("token");

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    throw new Error("Unauthorized");
  }

  if (response.status === 403) {
    throw new Error("Forbidden");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP error ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),

  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = void>(path: string) =>
    apiFetch<T>(path, { method: "DELETE" }),

  download: (path: string, filename: string, options?: RequestInit) =>
    apiDownload(path, filename, options),
};