export default function ProfileModal({ open, onClose, user }: any) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] w-[420px] rounded-xl border border-[var(--border)] shadow-xl p-6">

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Профиль пользователя
        </h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold text-white">
            {user[0].toUpperCase()}
          </div>

          <div>
            <p className="text-lg text-[var(--text-primary)] font-semibold">{user}</p>
            <p className="text-[var(--text-secondary)] text-sm">Привилегированный доступ</p>
          </div>
        </div>

        <div className="space-y-3 text-[var(--text-secondary)]">
          <p><span className="font-semibold text-[var(--text-primary)]">Роль:</span> Администратор</p>
          <p><span className="font-semibold text-[var(--text-primary)]">Статус:</span> Активен</p>
          <p><span className="font-semibold text-[var(--text-primary)]">Последний вход:</span> 03.12.2025 19:22</p>
          <p><span className="font-semibold text-[var(--text-primary)]">MFA:</span> Включено</p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-[#0052FF] rounded-lg text-white font-semibold hover:bg-[#0040cc] transition"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
