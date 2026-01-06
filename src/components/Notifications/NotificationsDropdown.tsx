import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";


export default function NotificationsDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* 🔔 Bell */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-white/5 transition"
      >
        <Bell className="w-5 h-5 text-[var(--text-primary)]" />

        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px]
              bg-red-600 text-white text-xs rounded-full
              flex items-center justify-center font-semibold"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* 📥 Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-80
            bg-[var(--bg-card)]
            border border-[var(--border)]
            rounded-xl shadow-xl
            z-[9999]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
            <span className="font-semibold text-sm text-[var(--text-primary)]">
              Уведомления
            </span>

            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#3BE3FD] hover:underline"
              >
                Прочитать все
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="p-4 text-sm text-[var(--text-secondary)]">
                Нет уведомлений
              </div>
            )}

            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`
                  w-full text-left px-4 py-3 text-sm
                  border-b border-[var(--border)]
                  transition
                  hover:bg-[#0F1931]
                  ${!n.is_read ? "bg-[#0E1A3A]" : ""}
                `}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* TEXT */}
                  <div className="flex-1">
                    <div className="font-medium text-[var(--text-primary)]">
                       {n.message}
                    </div>

                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      {n.created_at}
                    </div>
                  </div>

                  {/* READ INDICATOR */}
                  {n.is_read && (
                    <Check
                      size={16}
                      className="mt-1 text-[#3BE3FD]"
                      title="Прочитано"
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
