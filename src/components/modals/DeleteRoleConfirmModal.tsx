interface DeleteRoleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roleName: string;
}

export default function DeleteRoleConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  roleName,
}: DeleteRoleConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-[#0A0F24] w-[420px] p-6 rounded-xl border border-white/10 animate-fade">
        <h2 className="text-2xl font-bold mb-4 text-white">Удалить роль?</h2>

        <p className="text-gray-300 mb-6">
          Вы уверены, что хотите удалить роль{" "}
          <span className="text-red-400 font-semibold">{roleName}</span>? Это
          действие нельзя отменить.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition"
          >
            Отмена
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
