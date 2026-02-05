import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { API_URL } from "../api/config";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuth((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // 1. Добавляем состояние для видимости пароля
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        let message = "Ошибка входа";

        if (response.status === 401) {
          message = "Неверный логин или пароль";
        } else if (response.status === 403) {
          message =
            "Доступ запрещён. Проверьте политики безопасности или MFA.";
        } else {
          try {
            const err = await response.json();
            message = err.detail || message;
          } catch {}
        }

        setLoginError(message);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!data.access_token) {
        setLoginError("Токен не получен от сервера");
        setLoading(false);
        return;
      }

      login(data.access_token);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setLoginError(err.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setLoginError(null);
    setResetMessage(null);

    try {
      const res = await fetch(`${API_URL}/auth/password-reset/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error();

      setResetMessage(
        "Если такой email существует, инструкция для восстановления доступа отправлена"
      );
    } catch {
      setLoginError("Ошибка восстановления пароля");
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#0A0F24] flex items-center justify-center overflow-hidden">
      <form
        onSubmit={handleLogin}
        className="relative z-10 w-[420px] p-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
      >
        <h1 className="text-4xl font-extrabold text-center text-white mb-6">
          Kaz<span className="text-[#0052FF]">PAM</span>
        </h1>

        <input
          type="email"
          placeholder="E-mail"
          required
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* 2. Изменили type="password" на условие */}
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Пароль"
          required
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-2" // уменьшил mb-4 до mb-2
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* 3. Добавили чекбокс "Показать пароль" */}
        <div className="flex items-center mb-6 pl-1">
          <input
            id="show-pass"
            type="checkbox"
            checked={showPassword}
            onChange={() => setShowPassword((prev) => !prev)}
            className="w-4 h-4 cursor-pointer accent-[#0052FF]"
          />
          <label 
            htmlFor="show-pass" 
            className="ml-2 text-sm text-white/80 cursor-pointer select-none hover:text-white"
          >
            Показать пароль
          </label>
        </div>

        <button
          disabled={loading}
          className="w-full py-3 bg-[#0052FF] rounded-lg text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Вход..." : "Войти"}
        </button>

        <button
          type="button"
          disabled={!email}
          onClick={handlePasswordReset}
          className="mt-4 w-full text-sm text-[#3BE3FD] disabled:opacity-50"
        >
          Забыли пароль?
        </button>

        {loginError && (
          <p className="mt-4 text-center text-sm text-red-400">
            {loginError}
          </p>
        )}

        {resetMessage && (
          <p className="mt-4 text-center text-sm text-[#3BE3FD]">
            {resetMessage}
          </p>
        )}
      </form>
    </div>
  );
}