// src/services/api.ts
import { API_URL } from "../api/config";

const API_BASE_URL = API_URL;

/**
 * =====================================================
 * TOKEN HELPERS
 * =====================================================
 */
function getToken(): string | null {
  return localStorage.getItem("access_token");
}

/**
 * =====================================================
 * apiFetch — OVERLOADS (ALL EXPORTED)
 * =====================================================
 */

// Generic overload (используется api.get<T>, api.post<T> и т.д.)
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T>;

// Non-generic overload (используется Forgot / Reset)
export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<any>;

/**
 * =====================================================
 * SINGLE IMPLEMENTATION
 * =====================================================
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
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

  // === AUTH ERRORS ===
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

  // === SAFE BODY PARSING ===
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * =====================================================
 * PUBLIC API OBJECT (НЕ ЛОМАЕМ КОНТРАКТ)
 * =====================================================
 */
export const api = {
  get: <T>(path: string) =>
    apiFetch<T>(path),

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
};
