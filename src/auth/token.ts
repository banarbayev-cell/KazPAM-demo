// src/auth/token.ts
export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function clearAuth(): void {
  localStorage.removeItem("access_token");
}
