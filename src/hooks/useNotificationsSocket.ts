import { useEffect, useRef } from "react";
import { useNotifications } from "./useNotifications";
import { useAuth } from "../store/auth";

export function useNotificationsSocket() {
  const token = useAuth((s) => s.token);
  const { refresh } = useNotifications();

  const closingRef = useRef(false);
  const refreshRef = useRef(refresh);

  // держим актуальную ссылку на refresh без deps
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!token) return;

    closingRef.current = false;

    const ws = new WebSocket(`${import.meta.env.VITE_API_WS}/ws/notifications?token=${token}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === "notification") {
          refreshRef.current();
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      // в dev StrictMode сокет может закрыться в cleanup до коннекта — это не авария
      if (!closingRef.current) {
        console.warn("Notifications WS error");
      }
    };

    ws.onclose = () => {
      // можно оставить пустым; главное — не шуметь как ошибкой при cleanup
    };

    return () => {
      closingRef.current = true;
      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  }, [token]);
}