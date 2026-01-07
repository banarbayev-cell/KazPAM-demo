import { useEffect } from "react";
import { useNotifications } from "./useNotifications";
import { useAuth } from "../store/auth";

export function useNotificationsSocket() {
  const { refresh } = useNotifications();
  const token = useAuth((s) => s.token);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(
      `${import.meta.env.VITE_API_WS}/ws/notifications?token=${token}`
    );

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "notification") {
          refresh(); // аккуратно обновляем список
        }
      } catch {}
    };

    return () => ws.close();
  }, [token, refresh]);
}
