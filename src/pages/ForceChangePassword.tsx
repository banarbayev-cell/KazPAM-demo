import { FormEvent, useState } from "react";
import { useAuth } from "../store/auth";
import { api, invalidateAuthSession } from "../services/api";

function extractApiErrorMessage(err: unknown): string {
  const raw = String((err as any)?.message || "").trim();

  if (!raw) return "Не удалось изменить пароль";

  if (raw === "Unauthorized") {
    return "Сессия недействительна. Войдите заново";
  }

  if (raw === "Forbidden") {
    return "Доступ запрещён";
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.detail === "string" && parsed.detail.trim()) {
      return parsed.detail.trim();
    }
  } catch {
    // ignore
  }

  return raw;
}

export default function ForceChangePassword() {
  const logout = useAuth((s) => s.logout);
  const user = useAuth((s) => s.user);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword.trim()) {
      setError("Введите текущий временный пароль");
      return;
    }

    if (newPassword !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    if (newPassword.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }

    if (currentPassword === newPassword) {
      setError("Новый пароль должен отличаться от текущего");
      return;
    }

    setLoading(true);

    try {
      await api.post(`/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword,
      });

      // 1) мгновенно останавливаем дальнейшие API запросы старой сессии
      invalidateAuthSession();

      // 2) чистим localStorage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      // 3) чистим Zustand store
      logout();

      // 4) полный redirect без history
      window.location.replace("/login?passwordChanged=1");
    } catch (e: unknown) {
      setError(extractApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0F24] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[440px] p-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
      >
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          Требуется смена пароля
        </h1>

        <p className="text-center text-white/60 text-sm mb-8">
          Вы вошли по временному паролю.
          <br />
          Установите новый безопасный пароль.
        </p>

        <p className="text-center text-[#3BE3FD] text-xs mb-6">
          Используйте временный пароль, полученный в письме
        </p>

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Текущий (временный) пароль"
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-4 focus:outline-none focus:border-[#3BE3FD]"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Новый пароль"
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-4 focus:outline-none focus:border-[#3BE3FD]"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Повторите новый пароль"
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-6 focus:outline-none focus:border-[#3BE3FD]"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <div className="flex items-center mb-6 pl-1">
          <input
            id="show-pass-force"
            type="checkbox"
            checked={showPassword}
            onChange={() => setShowPassword((prev) => !prev)}
            className="w-4 h-4 cursor-pointer accent-[#0052FF]"
          />
          <label
            htmlFor="show-pass-force"
            className="ml-2 text-sm text-white/80 cursor-pointer select-none hover:text-white"
          >
            Показать пароль
          </label>
        </div>

        {error && (
          <div className="mb-4 text-red-400 text-sm text-center">{error}</div>
        )}

        <button
          disabled={loading}
          className="w-full py-3 bg-[#0052FF] rounded-lg text-white font-semibold disabled:opacity-50 hover:bg-[#1f6bff] transition"
        >
          {loading ? "Сохраняем..." : "Сменить пароль"}
        </button>

        <p className="mt-6 text-center text-[11px] text-white/40">
          Security Policy Enforcement · KazPAM
        </p>
      </form>
    </div>
  );
}