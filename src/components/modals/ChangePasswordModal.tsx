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

  // 🔐 password policy
  const passwordRules = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };

  const passwordScore =
    Object.values(passwordRules).filter(Boolean).length;

  if (!open) return null;

  const resetForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirm("");
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (!oldPassword || !newPassword || !confirm) {
      setError("Заполните все поля");
      return;
    }

    if (newPassword !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    if (passwordScore < 3) {
      setError("Пароль слишком слабый");
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
        let msg = "Не удалось сменить пароль";

        if (Array.isArray(data?.detail)) {
          msg = data.detail.map((e: any) => e.msg).join(", ");
        } else if (typeof data?.detail === "string") {
          msg = data.detail;
        }

        setError(msg);
        return;
      }

      // ✅ SUCCESS
      setMessage("Пароль успешно изменён");

      setOldPassword("");
      setNewPassword("");
      setConfirm("");

      // logout через 2 секунды
      setTimeout(() => {
        logout();
        window.location.href = "/login";
      }, 2000);

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

        {/* CURRENT PASSWORD */}
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

        <label className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <input
            type="checkbox"
            checked={showNew}
            onChange={() => setShowNew((v) => !v)}
          />
          Показать пароль
        </label>

        {/* PASSWORD STRENGTH */}
        <div className="mb-3">

          <div className="flex gap-1 mb-2">
            {[1,2,3,4].map(i => (
              <div
                key={i}
                className={`h-2 flex-1 rounded 
                ${passwordScore >= i ? "bg-green-500" : "bg-gray-700"}`}
              />
            ))}
          </div>

          <div className="text-xs text-gray-400 space-y-1">

            <div className={passwordRules.length ? "text-green-400" : ""}>
              • минимум 8 символов
            </div>

            <div className={passwordRules.uppercase ? "text-green-400" : ""}>
              • заглавная буква
            </div>

            <div className={passwordRules.number ? "text-green-400" : ""}>
              • цифра
            </div>

            <div className={passwordRules.special ? "text-green-400" : ""}>
              • спецсимвол
            </div>

          </div>

        </div>


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
          <div className="bg-green-900/40 border border-green-600 text-green-300 text-sm px-3 py-2 rounded-lg mb-3">
            ✓ {message}
          </div>
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
            disabled={
              loading ||
              passwordScore < 3 ||
              newPassword !== confirm
            }
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