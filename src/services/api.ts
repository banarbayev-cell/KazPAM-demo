// src/services/api.ts
import { API_URL } from "../api/config";

const API_BASE_URL = API_URL;

/**
 * Получение access token
 */
function getToken(): string | null {
  return localStorage.getItem("access_token");
}

/**
 * Базовый API fetch
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // === AUTH ERRORS ===
  if (response.status === 401) {
    console.error("❌ API 401 Unauthorized", path);
    throw new Error("Unauthorized");
  }

  if (response.status === 403) {
    throw new Error("Forbidden");
  }

  // === OTHER ERRORS ===
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP error ${response.status}`);
  }

  // === SAFE BODY PARSING (CRITICAL FIX) ===
  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn("⚠️ Failed to parse JSON response:", text);
    return undefined as T;
  }
}


export const api = {
  get: <T>(path: string) => apiFetch<T>(path),

  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = void>(path: string) =>
    apiFetch<T>(path, {
      method: "DELETE",
    }),
};

