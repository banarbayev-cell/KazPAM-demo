import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../store/auth";
import { API_URL } from "../api/config";
import PasswordResetModal from "../components/modals/PasswordResetModal";

function normalizeErrorMessage(detail: string | null | undefined): string {
  const text = String(detail || "").trim().toLowerCase();

  if (!text) {
    return "Доступ ограничен политиками безопасности или требуется MFA";
  }

  if (
    text.includes("mfa") ||
    text.includes("2fa") ||
    text.includes("second factor") ||
    text.includes("two-factor") ||
    text.includes("otp") ||
    text.includes("totp")
  ) {
    return "Требуется подтверждение второго фактора (MFA)";
  }

  if (
    text.includes("policy") ||
    text.includes("security") ||
    text.includes("forbidden") ||
    text.includes("blocked") ||
    text.includes("доступ") ||
    text.includes("полит")
  ) {
    return "Доступ ограничен политиками безопасности";
  }

  return detail || "Ошибка входа";
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const login = useAuth((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const passwordChanged = searchParams.get("passwordChanged") === "1";

  // ================= LOGIN =================
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    setResetMessage(null);

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
        let detail: string | null = null;

        try {
          const err = await response.json();
          if (typeof err?.detail === "string") {
            detail = err.detail;
          } else if (typeof err?.message === "string") {
            detail = err.message;
          }
        } catch {
          // ignore json parse error
        }

        if (response.status === 401) {
          message = "Неверный логин или пароль";
        } else if (response.status === 403) {
          message = normalizeErrorMessage(detail);
        } else {
          message = detail || message;
        }

        setLoginError(message);
        return;
      }

      const data = await response.json();

      if (!data.access_token) {
        setLoginError("Сервер не выдал токен доступа");
        return;
      }

      await login(data.access_token);

      if (useAuth.getState().mustChangePassword) {
        navigate("/force-change-password", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      setLoginError(err?.message || "Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  // ================= RESET =================
  const handlePasswordReset = async () => {
    setLoginError(null);
    setResetMessage(null);

    if (!email || !email.includes("@")) {
      setResetOpen(true);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/password-reset/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      await res.json().catch(() => null);

      setResetMessage(
        "Если аккаунт существует, инструкции отправлены на почту"
      );
    } catch {
      setLoginError("Сервер временно недоступен");
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#0A0F24] flex items-center justify-center overflow-hidden">
      <form
        onSubmit={handleLogin}
        className="relative z-10 w-[420px] p-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
      >
        <h1 className="text-4xl font-extrabold text-center text-white mb-1">
          Kaz<span className="text-[#0052FF]">PAM</span>
        </h1>

        <p className="text-center text-xs text-white/50 mb-6 tracking-wide">
          Privileged Access Management · Made in Kazakhstan
        </p>

        {passwordChanged && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300 text-center">
            Пароль успешно изменён. Войдите снова с новым паролем.
          </div>
        )}

        <input
          type="email"
          placeholder="E-mail"
          required
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-4 focus:outline-none focus:border-[#3BE3FD]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Пароль"
          required
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-2 focus:outline-none focus:border-[#3BE3FD]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

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
          className="w-full py-3 bg-[#0052FF] rounded-lg text-white font-semibold disabled:opacity-50 hover:bg-[#1f6bff] transition"
        >
          {loading ? "Авторизация..." : "Войти"}
        </button>

        <button
          type="button"
          onClick={handlePasswordReset}
          className="mt-4 w-full text-sm text-[#3BE3FD] hover:text-white transition"
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

        <p className="mt-6 text-center text-[11px] text-white/40">
          Secure Access Gateway · Zero Trust Architecture
        </p>
      </form>

      <PasswordResetModal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
      />
    </div>
  );
}