interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  session: {
    user: string;
    system: string;
    ip: string;
  };
}

export default function ConfirmTerminateSessionModal({
  open,
  onCancel,
  onConfirm,
  session,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121A33] text-white w-[420px] rounded-xl border border-[#1E2A45] p-6">
        <h2 className="text-lg font-bold mb-3">
          Принудительное завершение сессии
        </h2>

        <p className="text-sm text-gray-300 mb-4">
          Вы собираетесь принудительно завершить активную сессию.
          Пользователь будет немедленно отключён от системы.
        </p>

        <div className="bg-[#0E1A3A] rounded-md p-3 text-sm mb-6">
          <div><span className="text-gray-400">Пользователь:</span> {session.user}</div>
          <div><span className="text-gray-400">Система:</span> {session.system}</div>
          <div><span className="text-gray-400">IP:</span> {session.ip}</div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-[#1A243F] hover:bg-[#0E1A3A]"
          >
            Отмена
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700"
          >
            Завершить сессию
          </button>
        </div>
      </div>
    </div>
  );
}
