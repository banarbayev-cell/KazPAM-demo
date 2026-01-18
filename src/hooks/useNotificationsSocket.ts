import { useEffect } from "react";
import { useNotifications } from "./useNotifications";
import { useAuth } from "../store/auth";

export function useNotificationsSocket() {
  // 🔐 Канонично получаем token (ОДИН selector)
  const token = useAuth((s) => s.token);

  // 🔔 notifications API
  const { refresh } = useNotifications();

  useEffect(() => {
    // без токена — без сокета (важно для logout / init)
    if (!token) return;

    const ws = new WebSocket(
      `${import.meta.env.VITE_API_WS}/ws/notifications?token=${token}`
    );

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === "notification") {
          refresh();
        }
      } catch {
        // намеренно игнорируем мусор
      }
    };

    ws.onerror = () => {
      // сокет не должен валить приложение
      console.warn("Notifications WS error");
    };

    return () => {
      ws.close();
    };
  }, [token]); // ❗ refresh НЕ В deps
}
