import { create } from "zustand";
import jwtDecode from "jwt-decode";

interface DecodedToken {
  sub: string;
  role: string;
  permissions: any;   // backend может отдать массив или объект
  exp: number;
}

interface AuthUser {
  email: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;

  login: (token: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,

  login: (token: string) => {
    localStorage.setItem("access_token", token);

    const decoded = jwtDecode<DecodedToken>(token);

    const safePermissions = Array.isArray(decoded.permissions)
      ? decoded.permissions
      : [];

    set({
      token,
      user: {
        email: decoded.sub,
        role: decoded.role,
        permissions: safePermissions,
      },
    });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    set({ user: null, token: null });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);

      const safePermissions = Array.isArray(decoded.permissions)
        ? decoded.permissions
        : [];

      set({
        token,
        user: {
          email: decoded.sub,
          role: decoded.role,
          permissions: safePermissions,
        },
      });
    } catch {
      localStorage.removeItem("access_token");
      set({ token: null, user: null });
    }
  },
}));
