import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { api } from "../services/api";

export default function ForceChangePassword() {
  const navigate = useNavigate();
  const logout = useAuth((s) => s.logout);
  const user = useAuth((s) => s.user);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    if (newPassword.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }

    setLoading(true);

    try {
      /**
       * backend endpoint:
       * POST /users/{user_id}/reset-password
       * ResetPasswordRequest
       */
      await api.post(`/auth/change-password`, {
  current_password: currentPassword,
  new_password: newPassword,
});


      /**
       * После смены пароля:
       * — токен становится небезопасным
       * — делаем logout
       * — отправляем на login
       */
      logout();

      navigate("/login", {
        replace: true,
        state: { passwordChanged: true },
      });
    } catch (e: any) {
      setError(e?.message || "Не удалось изменить пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0F24] flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-[440px] p-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
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
    type="checkbox"
    checked={showPassword}
    onChange={() => setShowPassword(prev => !prev)}
    className="w-4 h-4 cursor-pointer accent-[#0052FF]"
  />
  <label className="ml-2 text-sm text-white/80 cursor-pointer select-none hover:text-white">
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
