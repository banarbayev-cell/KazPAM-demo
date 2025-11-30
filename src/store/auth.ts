import { create } from "zustand";

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  setToken: (token) => {
    set({ token });
    if (token) {
      localStorage.setItem("token", token);
    }
  },
  logout: () => {
    set({ token: null });
    localStorage.removeItem("token");
  },
}));
