import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { resolveNotification } from "../utils/notificationResolver";
import { useNotificationContext } from "../store/notificationContext";

/* =========================
   Date helpers
========================= */

function parseBackendTimestamp(value?: string): Date | null {
  if (!value) return null;

  if (value.includes("T")) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  const match = value.match(
    /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/
  );
  if (!match) return null;

  const [, dd, mm, yyyy, hh = "00", min = "00", ss = "00"] = match;
  const d = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
    Number(ss)
  );
  return isNaN(d.getTime()) ? null : d;
}

function formatDateSafe(value?: string): string {
  const d = parseBackendTimestamp(value);
  if (!d) return "—";

  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================
   Details parser
========================= */

function parseDetails(details: unknown): any {
  if (!details) return {};

  if (typeof details === "string") {
    try {
      return JSON.parse(details.replace(/'/g, '"'));
    } catch {
      return { raw: details };
    }
  }

  if (typeof details === "object") return details;

  return { raw: String(details) };
}

/* =========================
   Frontend Notification
========================= */

export interface Notification {
  id: number;
  message: string;
  created_at: string;
  is_read: boolean;
  category?: string;
  meta?: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ctxUsers = useNotificationContext((s) => s.users);
  const ctxRoles = useNotificationContext((s) => s.roles);
  const ctxPolicies = useNotificationContext((s) => s.policies);
  const loadCtx = useNotificationContext((s) => s.load);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      void loadCtx();

      const raw = await api.get<any[]>("/notifications/");

      const normalized: Notification[] = Array.isArray(raw)
        ? raw.map((n) => {
            const detailsObj = parseDetails(n.details);
            const message = resolveNotification(n.action, detailsObj, {
              users: ctxUsers,
              roles: ctxRoles,
              policies: ctxPolicies,
            });

            return {
              id: Number(n.audit_id),
              message,
              created_at: formatDateSafe(n.timestamp),
              is_read: Boolean(n.is_read),
              category: n.category,
              meta: detailsObj,
            };
          })
        : [];

      setNotifications(normalized);
    } catch (e: any) {
      console.error("Failed to load notifications:", e);
      setError(e?.message ?? "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [ctxUsers, ctxRoles, ctxPolicies, loadCtx]);

  const markAsRead = useCallback(async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    try {
      await api.post(`/notifications/${id}/read`);
    } catch {
      // ignore
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await api.post("/notifications/read-all");
    } catch {
      // ignore
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  useEffect(() => {
    void refresh();
    void loadCtx();
  }, [refresh, loadCtx]);

  useEffect(() => {
    const handleExternalRefresh = () => {
      void refresh();
    };

    window.addEventListener(
      "kazpam:notifications-refresh",
      handleExternalRefresh
    );

    return () => {
      window.removeEventListener(
        "kazpam:notifications-refresh",
        handleExternalRefresh
      );
    };
  }, [refresh]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  };
}