// src/components/modals/ChangePasswordModal.tsx

import { useState } from "react";
import { API_URL } from "../../api/config";
import { useAuth } from "../../store/auth";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: Props) {
  const token = useAuth((s) => s.token);
  const logout = useAuth((s) => s.logout);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!open) return null;

  const resetForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirm("");
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (!oldPassword || !newPassword) {
      setError("Заполните все поля");
      return;
    }

    if (newPassword !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
           Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        let message = "Не удалось сменить пароль";

        if (Array.isArray(data?.detail)) {
          message = data.detail.map((e: any) => e.msg).join(", ");
        } else if (typeof data?.detail === "string") {
          message = data.detail;
        }

        setError(message);
        return;
      }

      setMessage("Пароль успешно изменён");

      resetForm();

      /**
       * PAM Best Practice
       * После смены пароля — разлогинить пользователя
       * чтобы обновить токен
       */
      setTimeout(() => {
        logout();
        window.location.href = "/login";
      }, 1500);

    } catch {
      setError("Сервер недоступен");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60">
      <div className="w-[420px] bg-[#121A33] border border-[#1E2A45] rounded-2xl p-6">

        <h2 className="text-xl font-bold text-white mb-4">
          Смена пароля
        </h2>

        {/* OLD PASSWORD */}
        <input
          type={showOld ? "text" : "password"}
          placeholder="Текущий пароль"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="w-full mb-2 p-3 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg text-white"
        />

        <label className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <input
            type="checkbox"
            checked={showOld}
            onChange={() => setShowOld((v) => !v)}
          />
          Показать пароль
        </label>

        {/* NEW PASSWORD */}
        <input
          type={showNew ? "text" : "password"}
          placeholder="Новый пароль"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full mb-2 p-3 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg text-white"
        />

        <label className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <input
            type="checkbox"
            checked={showNew}
            onChange={() => setShowNew((v) => !v)}
          />
          Показать пароль
        </label>

        {/* CONFIRM PASSWORD */}
        <input
          type={showConfirm ? "text" : "password"}
          placeholder="Повторите пароль"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full mb-2 p-3 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg text-white"
        />

        <label className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <input
            type="checkbox"
            checked={showConfirm}
            onChange={() => setShowConfirm((v) => !v)}
          />
          Показать пароль
        </label>

        {/* ERROR */}
        {error && (
          <div className="text-red-400 text-sm mb-2">{error}</div>
        )}

        {/* SUCCESS */}
        {message && (
          <div className="text-green-400 text-sm mb-2">{message}</div>
        )}

        {/* BUTTONS */}
        <div className="flex justify-end gap-2 mt-4">

          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition"
          >
            Отмена
          </button>

          <button
            disabled={loading}
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-[#0052FF] text-white disabled:opacity-50 hover:bg-[#1f6bff] transition"
          >
            {loading ? "Смена..." : "Сменить"}
          </button>

        </div>
      </div>
    </div>
  );
}