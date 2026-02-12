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
  permissions?: any;
  exp: number;

  /**
   * PAM security state
   * true = пользователь обязан сменить пароль
   */
  pwd_reset_required?: boolean;
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

  /**
   * ⛔ PAM режим безопасности
   * если true — доступ только к странице смены пароля
   */
  mustChangePassword: boolean;

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
  mustChangePassword: false,

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

    const mustChangePassword = decoded.pwd_reset_required === true;

    /**
     * 1️⃣ минимальный пользователь из JWT
     */
    set({
      token,
      mustChangePassword,
      user: {
        email: decoded.sub,
        permissions: safePermissions,
      } as AuthUser,
      isInitialized: true,
    });

    /**
     * 2️⃣ ВАЖНО:
     * если требуется смена пароля —
     * backend специально блокирует /users/me
     */
    if (!mustChangePassword) {
      await get().fetchMe();
    }
  },

  /**
   * =====================================================
   * LOGOUT
   * =====================================================
   */
  logout: () => {
    localStorage.removeItem("access_token");
    set({
      token: null,
      user: null,
      mustChangePassword: false,
      isInitialized: true,
    });
  },

  /**
   * =====================================================
   * FETCH PROFILE (/users/me)
   * =====================================================
   */
  fetchMe: async () => {
    if (get().mustChangePassword) {
      // PAM режим — профиль намеренно недоступен
      return;
    }

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
      // мягкая деградация — logout НЕ делаем
    }
  },

  /**
   * =====================================================
   * LOAD FROM STORAGE (APP INIT / F5)
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
       * Проверка срока
       */
      if (decoded.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }

      const safePermissions = Array.isArray(decoded.permissions)
        ? decoded.permissions
        : [];

      const mustChangePassword = decoded.pwd_reset_required === true;

      /**
       * Восстанавливаем состояние
       */
      set({
        token,
        mustChangePassword,
        user: {
          email: decoded.sub,
          permissions: safePermissions,
        } as AuthUser,
        isInitialized: true,
      });

      /**
       * Если это нормальный пользователь —
       * подгружаем профиль
       */
      if (!mustChangePassword) {
        await get().fetchMe();
      }
    } catch {
      localStorage.removeItem("access_token");
      set({
        token: null,
        user: null,
        mustChangePassword: false,
        isInitialized: true,
      });
    }
  },
}));
