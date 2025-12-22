import { createPortal } from "react-dom";
import { logout } from "../../utils/auth";

export default function ProfileModal({ open, onClose, user }: any) {
  if (!open) return null;

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

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold text-white">
            {user?.[0]?.toUpperCase()}
          </div>

          <div>
            <p className="text-lg text-[var(--text-primary)] font-semibold">
              {user}
            </p>
            <p className="text-[var(--text-secondary)] text-sm">
              Привилегированный доступ
            </p>
          </div>
        </div>

        <div className="space-y-3 text-[var(--text-secondary)] mb-6">
          <p><span className="font-semibold text-[var(--text-primary)]">Роль:</span> Администратор</p>
          <p><span className="font-semibold text-[var(--text-primary)]">Статус:</span> Активен</p>
          <p><span className="font-semibold text-[var(--text-primary)]">Последний вход:</span> 03.12.2025 19:22</p>
          <p><span className="font-semibold text-[var(--text-primary)]">MFA:</span> Включено</p>
        </div>

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
