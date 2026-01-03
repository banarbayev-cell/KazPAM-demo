import { create } from "zustand";
import jwtDecode from "jwt-decode";

interface DecodedToken {
  sub: string;
  role?: string;
  permissions: any;
  exp: number;
}

interface AuthUser {
  email: string;
  role?: string;
  permissions: string[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isInitialized: boolean;

  login: (token: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  isInitialized: false,

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
      isInitialized: true,
    });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    set({ token: null, user: null, isInitialized: true });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      set({ isInitialized: true });
      return;
    }

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
        isInitialized: true,
      });
    } catch {
      localStorage.removeItem("token");
      set({ token: null, user: null, isInitialized: true });
    }
  },
}));
