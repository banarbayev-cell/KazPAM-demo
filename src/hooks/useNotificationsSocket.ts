import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "../store/auth";
import { API_URL } from "../api/config";

export function useNotificationsSocket() {
  const token = useAuth((s) => s.token);
  const isInitialized = useAuth((s) => s.isInitialized);

  const wsRef = useRef<WebSocket | null>(null);
  const closingRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authToken = useMemo(() => {
    return token || localStorage.getItem("access_token") || "";
  }, [token]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!authToken) return;

    const wsBase = API_URL.replace(/^http/, "ws").replace(/\/+$/, "");
    const wsUrl = `${wsBase}/ws/notifications?token=${encodeURIComponent(
      authToken
    )}`;

    let mounted = true;

    const cleanupSocket = () => {
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "Notifications socket cleanup");
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };

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

      ws.onopen = () => {
        // socket connected
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (
            data?.type === "notification:new" ||
            data?.type === "notification"
          ) {
            window.dispatchEvent(
              new Event("kazpam:notifications-refresh")
            );
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        if (!mounted || closingRef.current) return;
        console.warn("Notifications WS error");
      };

      ws.onclose = (event) => {
        if (!mounted || closingRef.current) return;

        // при 1008 / 403 не спамим бесконечно слишком часто
        const retryDelay =
          event.code === 1008 ? 8000 : 3000;

        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, retryDelay);
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

      cleanupSocket();
    };
  }, [authToken, isInitialized]);
}