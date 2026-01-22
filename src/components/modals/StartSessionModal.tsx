import { useState } from "react";
import { startSession } from "@/api/sessions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StartSessionModal({ isOpen, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    user: "",
    system: "",
    os: "Linux",
    ip: "",
    app: "SSH",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const submit = async () => {
    setLoading(true);
    setError(null);

    try {
      await startSession({
        ...form,
        mfa_passed: false,
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
        "Не удалось запустить сессию"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#121A33] text-white p-6 rounded-xl w-[420px] space-y-4">
        <h2 className="text-lg font-semibold">Запуск сессии</h2>

        <input
          placeholder="Пользователь (email)"
          className="w-full p-2 rounded bg-[#0E1A3A]"
          value={form.user}
          onChange={e => setForm({ ...form, user: e.target.value })}
        />

        <input
          placeholder="Система"
          className="w-full p-2 rounded bg-[#0E1A3A]"
          value={form.system}
          onChange={e => setForm({ ...form, system: e.target.value })}
        />

        <input
          placeholder="IP"
          className="w-full p-2 rounded bg-[#0E1A3A]"
          value={form.ip}
          onChange={e => setForm({ ...form, ip: e.target.value })}
        />

        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-gray-300">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 bg-[#0052FF] rounded"
          >
            Запустить
          </button>
        </div>
      </div>
    </div>
  );
}
