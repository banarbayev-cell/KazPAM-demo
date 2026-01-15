// src/components/modals/ProfileModal.tsx
import { createPortal } from "react-dom";
import { useAuth } from "../../store/auth";

/**
 * =====================================================
 * HELPERS
 * =====================================================
 */
function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PERMISSION_LABELS: Record<
  string,
  { ru: string; en: string }
> = {
  manage_users: {
    ru: "Управление пользователями (создание, удаление, блокировка)",
    en: "Manage users (create, delete, block)",
  },
  view_users: {
    ru: "Просмотр списка пользователей",
    en: "View users list",
  },
  manage_roles: {
    ru: "Управление ролями доступа",
    en: "Manage access roles",
  },
  view_audit: {
    ru: "Просмотр журналов аудита",
    en: "View audit logs",
  },
  export_audit: {
    ru: "Экспорт журналов аудита",
    en: "Export audit logs",
  },
  view_sessions: {
    ru: "Просмотр активных и завершённых сессий",
    en: "View active and finished sessions",
  },
  soc_actions: {
    ru: "SOC-действия (изоляция сессий, блокировка пользователей)",
    en: "SOC actions (isolate sessions, block users)",
  },
  manage_settings: {
    ru: "Изменение системных настроек",
    en: "Manage system settings",
  },
  view_settings: {
    ru: "Просмотр системных настроек",
    en: "View system settings",
  },
};

/**
 * =====================================================
 * COMPONENT
 * =====================================================
 * ⚠️ BACKWARD COMPATIBLE:
 * - если user передан через props → используем его
 * - если нет → берём user из useAuth
 */
export default function ProfileModal({
  open,
  onClose,
  user: userFromProps,
}: any) {
  const logout = useAuth((s) => s.logout);
  const authUser = useAuth((s) => s.user);

  if (!open) return null;

  /**
   * 🔐 ЕДИНЫЙ ИСТОЧНИК USER
   * props → store → null
   */
  const user = userFromProps ?? authUser;

  if (!user) return null;

  /**
   * =====================================================
   * DISPLAY DATA (SAFE)
   * =====================================================
   */
  const displayName =
    user.email || user.username || "user";

  const avatar =
    displayName?.[0]?.toUpperCase() || "U";

  const primaryRole =
    user?.roles?.[0]?.name || "—";

  


  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--bg-card)] w-[420px] rounded-xl border border-[var(--border)] shadow-2xl p-6 animate-fadeIn">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Профиль пользователя
        </h2>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold text-white">
            {avatar}
          </div>

          <div>
            <p className="text-lg text-[var(--text-primary)] font-semibold">
              {displayName}
            </p>
            <p className="text-[var(--text-secondary)] text-sm">
              Привилегированный доступ
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-3 text-[var(--text-secondary)] mb-6">
          <p>
            <span className="font-semibold text-[var(--text-primary)]">
              Роль:
            </span>{" "}
            {primaryRole}
          </p>

          <p>
            <span className="font-semibold text-[var(--text-primary)]">
              Статус:
            </span>{" "}
            {user.is_active ? "Активен" : "Отключён"}
          </p>

          <p>
            <span className="font-semibold text-[var(--text-primary)]">
              Последний вход:
            </span>{" "}
            {formatDate(user.last_login)}
          </p>

          <p>
            <span className="font-semibold text-[var(--text-primary)]">
              MFA:
            </span>{" "}
            {user.mfa_enabled ? "Включено" : "Выключено"}
          </p>

          {/* 🔒 Усиление: permissions (read-only, безопасно) */}
          {Array.isArray(user.permissions) && (
            <div>
              <span className="font-semibold text-[var(--text-primary)]">
                Permissions:
              </span>
              <div className="mt-1 max-h-24 overflow-y-auto rounded-md bg-[#0E1A3A] p-2 text-xs text-gray-300">
                {user.permissions.length > 0 ? (
                  <ul className="space-y-1">
                    {user.permissions.map((p: string) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#0052FF] rounded-lg text-white font-semibold hover:bg-[#0040cc] transition"
          >
            Закрыть
          </button>

          <button
            onClick={logout}
            className="w-full py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
