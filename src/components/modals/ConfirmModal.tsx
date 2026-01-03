import { Button } from "../ui/button";

interface ConfirmModalProps {
  open?: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText,
  onConfirm,
  onClose,
  loading = false,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999]">
      <div className="bg-[#0A0F24] text-white border border-gray-700 rounded-xl shadow-xl p-6 w-[380px]">

        <h2 className="text-xl font-bold mb-3">{title}</h2>
        <p className="text-gray-300 mb-6">{message}</p>

        <div className="flex justify-end gap-3">

          <Button
            className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
            onClick={onClose}
            disabled={loading}
          >
            Отмена
          </Button>

          <Button
            className="bg-red-600 hover:bg-red-700 text-white border border-red-700"
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmText}
          </Button>

        </div>
      </div>
    </div>
  );
}
