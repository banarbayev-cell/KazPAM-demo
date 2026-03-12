import { useEffect, useRef } from "react";
import { useNotifications } from "./useNotifications";
import { useAuth } from "../store/auth";
import { API_URL } from "../api/config";

export function useNotificationsSocket() {
  const token = useAuth((s) => s.token);
  const { refresh } = useNotifications();

  const wsRef = useRef<WebSocket | null>(null);
  const closingRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!token) return;

    const wsBase = API_URL.replace(/^http/, "ws");
    const wsUrl = `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`;
    let mounted = true;

    const connect = () => {
      if (!mounted) return;

      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      closingRef.current = false;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "notification:new" || data?.type === "notification") {
            refreshRef.current();
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        if (!mounted || closingRef.current) return;
        console.warn("Notifications WS error");
      };

      ws.onclose = () => {
        if (!mounted || closingRef.current) return;

        console.log("Notifications WS closed");

        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      mounted = false;
      closingRef.current = true;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "Notifications socket cleanup");
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [token]);
}