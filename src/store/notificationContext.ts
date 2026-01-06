// src/store/notificationContext.ts
import { create } from "zustand";
import { api } from "../services/api";

type IdMap = Record<number, string>;

interface NotificationContextState {
  users: IdMap;
  roles: IdMap;
  policies: IdMap;

  isLoading: boolean;
  loaded: boolean;
  error: string | null;

  load: () => Promise<void>;
}

function toIdMap<T>(items: T[], getId: (x: T) => number, getName: (x: T) => string): IdMap {
  const map: IdMap = {};
  for (const it of items) {
    const id = getId(it);
    const name = getName(it);
    if (typeof id === "number" && name) map[id] = name;
  }
  return map;
}

export const useNotificationContext = create<NotificationContextState>((set, get) => ({
  users: {},
  roles: {},
  policies: {},

  isLoading: false,
  loaded: false,
  error: null,

  load: async () => {
    if (get().loaded || get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      // Эти эндпойнты должны УЖЕ быть в KazPAM (Users/Roles/Policies).
      // Если какой-то из них ограничен RBAC — просто вернётся 403,
      // мы обработаем best-effort и загрузим то, что доступно.
      const [usersRes, rolesRes, policiesRes] = await Promise.allSettled([
        api.get<any[]>("/users/"),
        api.get<any[]>("/roles/"),
        api.get<any[]>("/policies/"),
      ]);

      const users =
        usersRes.status === "fulfilled" && Array.isArray(usersRes.value)
          ? toIdMap(usersRes.value, (u) => Number(u.id), (u) => String(u.email ?? u.name ?? `ID ${u.id}`))
          : {};

      const roles =
        rolesRes.status === "fulfilled" && Array.isArray(rolesRes.value)
          ? toIdMap(rolesRes.value, (r) => Number(r.id), (r) => String(r.name ?? `ID ${r.id}`))
          : {};

      const policies =
        policiesRes.status === "fulfilled" && Array.isArray(policiesRes.value)
          ? toIdMap(policiesRes.value, (p) => Number(p.id), (p) => String(p.name ?? `ID ${p.id}`))
          : {};

      set({
        users,
        roles,
        policies,
        loaded: true,
      });
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to load notification context" });
    } finally {
      set({ isLoading: false });
    }
  },
}));
