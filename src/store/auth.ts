import { create } from "zustand";
import jwtDecode from "jwt-decode";
import { api } from "../services/api";

/**
 * =====================================================
 * JWT TOKEN
 * =====================================================
 * ⚠️ ОСТАВЛЯЕМ permissions и role — для backward compatibility
 */
interface DecodedToken {
  sub: string;
  role?: string;
  permissions?: any;
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

  /**
   * ⬇️ НЕОБЯЗАТЕЛЬНО
   * backend может начать отдавать permissions позже
   */
  permissions?: string[];
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

    let decoded: DecodedToken;
    try {
      decoded = jwtDecode<DecodedToken>(token);
    } catch {
      console.error("❌ Invalid JWT");
      get().logout();
      return;
    }

    const safePermissions = Array.isArray(decoded.permissions)
      ? decoded.permissions
      : [];

    /**
     * 1️⃣ Кладём минимального user (JWT fallback)
     *    — это сохраняет текущую логику Access(permission)
     */
    set({
      token,
      user: {
        email: decoded.sub,
        permissions: safePermissions,
      } as AuthUser,
      isInitialized: true,
    });

    /**
     * 2️⃣ ДОгружаем профиль
     */
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
   * ⚠️ НИЧЕГО НЕ ЛОМАЕМ:
   * - если permissions пришли — используем их
   * - если нет — оставляем JWT permissions
   */
  fetchMe: async () => {
    try {
      const me = await api.get<UserProfile>("/users/me");

      set((state) => {
        const fallbackPermissions = state.user?.permissions ?? [];

        return {
          user: {
            ...me,
            permissions: Array.isArray(me.permissions)
              ? me.permissions
              : fallbackPermissions,
          },
        };
      });
    } catch (e) {
      console.error("❌ fetchMe failed", e);
      // ⚠️ logout НЕ делаем — мягкая деградация
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

      /**
       * ⛔ Проверка exp (УСИЛЕНИЕ)
       */
      if (decoded.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }

      const safePermissions = Array.isArray(decoded.permissions)
        ? decoded.permissions
        : [];

      /**
       * 1️⃣ Восстанавливаем JWT-состояние
       */
      set({
        token,
        user: {
          email: decoded.sub,
          permissions: safePermissions,
        } as AuthUser,
        isInitialized: true,
      });

      /**
       * 2️⃣ ДОгружаем профиль
       */
      await get().fetchMe();
    } catch {
      localStorage.removeItem("access_token");
      set({ token: null, user: null, isInitialized: true });
    }
  },
}));
