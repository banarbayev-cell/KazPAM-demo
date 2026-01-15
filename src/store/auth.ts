import { create } from "zustand";
import jwtDecode from "jwt-decode";
import { api } from "../services/api";

/**
 * =====================================================
 * JWT TOKEN
 * =====================================================
 */
interface DecodedToken {
  sub: string;
  role?: string;
  permissions: any;
  exp: number;
}

/**
 * =====================================================
 * USER PROFILE (из /users/me)
 * =====================================================
 */
interface UserProfile {
  id: number;
  email: string;
  is_active: boolean;
  mfa_enabled: boolean;
  last_login: string | null;
  roles: Array<{
    id: number;
    name: string;
  }>;
}

/**
 * =====================================================
 * AUTH USER (JWT + PROFILE)
 * =====================================================
 */
interface AuthUser extends UserProfile {
  permissions: string[];
}

/**
 * =====================================================
 * STORE STATE
 * =====================================================
 */
interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isInitialized: boolean;

  login: (token: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

/**
 * =====================================================
 * STORE
 * =====================================================
 */
export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isInitialized: false,

  /**
   * =====================================================
   * LOGIN
   * =====================================================
   */
  login: async (token: string) => {
    localStorage.setItem("access_token", token);

    const decoded = jwtDecode<DecodedToken>(token);
    const safePermissions = Array.isArray(decoded.permissions)
      ? decoded.permissions
      : [];

    // 1️⃣ Сразу кладём минимального user (из JWT)
    set({
      token,
      user: {
        email: decoded.sub,
        permissions: safePermissions,
      } as AuthUser,
      isInitialized: true,
    });

    // 2️⃣ ДОгружаем полный профиль
    await get().fetchMe();
  },

  /**
   * =====================================================
   * LOGOUT
   * =====================================================
   */
  logout: () => {
    localStorage.removeItem("access_token");
    set({ token: null, user: null, isInitialized: true });
  },

  /**
   * =====================================================
   * FETCH PROFILE (/users/me)
   * =====================================================
   */
  fetchMe: async () => {
    try {
      const me = await api.get<UserProfile>("/users/me");

      set((state) => ({
        user: state.user
          ? {
              ...me,
              permissions: state.user.permissions, // ⚠️ permissions остаются из JWT
            }
          : {
              ...me,
              permissions: [],
            },
      }));
    } catch (e) {
      console.error("❌ fetchMe failed", e);
    }
  },

  /**
   * =====================================================
   * LOAD FROM STORAGE (APP INIT)
   * =====================================================
   */
  loadFromStorage: async () => {
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

      // 1️⃣ Восстанавливаем JWT-состояние
      set({
        token,
        user: {
          email: decoded.sub,
          permissions: safePermissions,
        } as AuthUser,
        isInitialized: true,
      });

      // 2️⃣ ДОгружаем профиль
      await get().fetchMe();
    } catch {
      localStorage.removeItem("access_token");
      set({ token: null, user: null, isInitialized: true });
    }
  },
}));
