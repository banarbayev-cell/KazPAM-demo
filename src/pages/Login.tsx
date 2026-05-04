import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../store/auth";
import { API_URL } from "../api/config";
import PasswordResetModal from "../components/modals/PasswordResetModal";

type MfaMethod = "totp" | "email";

interface LoginResponse {
  access_token?: string;
  token_type?: string;
  mfa_required?: boolean;
  mfa_method?: MfaMethod;
  mfa_challenge_token?: string;
  email_sent?: boolean;
}

interface MfaVerifyResponse {
  access_token?: string;
  token_type?: string;
}

function normalizeErrorMessage(detail: string | null | undefined): string {
  const text = String(detail || "").trim().toLowerCase();

  if (!text) {
    return "Доступ ограничен политиками безопасности или требуется MFA";
  }

  if (
    text.includes("invalid mfa") ||
    text.includes("mfa code") ||
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
    text.includes("expired mfa challenge") ||
    text.includes("invalid or expired")
  ) {
    return "Сессия MFA истекла. Введите логин и пароль заново.";
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

function sanitizeMfaCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
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

  // MFA login challenge state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>("totp");
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaEmailSent, setMfaEmailSent] = useState(false);

  const passwordChanged = searchParams.get("passwordChanged") === "1";

  const completeLogin = async (accessToken: string) => {
    await login(accessToken);

    if (useAuth.getState().mustChangePassword) {
      navigate("/force-change-password", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const resetMfaChallenge = () => {
    setMfaRequired(false);
    setMfaMethod("totp");
    setMfaChallengeToken(null);
    setMfaCode("");
    setMfaEmailSent(false);
    setLoginError(null);
  };

  // ================= LOGIN STEP 1: PASSWORD =================
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (mfaRequired && mfaChallengeToken) {
      await handleMfaVerify();
      return;
    }

    setLoading(true);
    setLoginError(null);
    setResetMessage(null);
    setMfaCode("");

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

      const data: LoginResponse = await response.json();

      // Enterprise MFA flow:
      // Password is correct, but backend intentionally does NOT issue access_token yet.
      if (data.mfa_required && data.mfa_challenge_token) {
        setMfaRequired(true);
        setMfaMethod(data.mfa_method || "totp");
        setMfaChallengeToken(data.mfa_challenge_token);
        setMfaEmailSent(Boolean(data.email_sent));
        setMfaCode("");
        setLoginError(null);
        return;
      }

      // Legacy / non-MFA flow.
      if (!data.access_token) {
        setLoginError("Сервер не выдал токен доступа");
        return;
      }

      await completeLogin(data.access_token);
    } catch (err: any) {
      setLoginError(err?.message || "Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  // ================= LOGIN STEP 2: MFA VERIFY =================
  const handleMfaVerify = async () => {
    const code = mfaCode.trim();

    if (!mfaChallengeToken) {
      setLoginError("MFA-сессия не найдена. Введите логин и пароль заново.");
      resetMfaChallenge();
      return;
    }

    if (code.length < 6) {
      setLoginError("Введите 6-значный код из Google Authenticator.");
      return;
    }

    setLoading(true);
    setLoginError(null);
    setResetMessage(null);

    try {
      const response = await fetch(`${API_URL}/auth/mfa-login/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mfa_challenge_token: mfaChallengeToken,
          code,
          method: mfaMethod,
        }),
      });

      if (!response.ok) {
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
          setLoginError(
            detail?.toLowerCase().includes("challenge")
              ? "Сессия MFA истекла. Введите логин и пароль заново."
              : "Неверный MFA-код"
          );
        } else {
          setLoginError(normalizeErrorMessage(detail));
        }

        return;
      }

      const data: MfaVerifyResponse = await response.json();

      if (!data.access_token) {
        setLoginError("Сервер не выдал токен доступа после MFA");
        return;
      }

      await completeLogin(data.access_token);
    } catch (err: any) {
      setLoginError(err?.message || "Ошибка проверки MFA");
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

  const mfaHelperText =
    mfaMethod === "email"
      ? mfaEmailSent
        ? "Введите код, отправленный на email."
        : "Введите одноразовый email-код."
      : "Введите код из приложения Google Authenticator.";

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

        {passwordChanged && !mfaRequired && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300 text-center">
            Пароль успешно изменён. Войдите снова с новым паролем.
          </div>
        )}

        {!mfaRequired ? (
          <>
            <input
              type="email"
              placeholder="E-mail"
              required
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-4 focus:outline-none focus:border-[#3BE3FD]"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (mfaRequired) resetMfaChallenge();
              }}
            />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Пароль"
              required
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-2 focus:outline-none focus:border-[#3BE3FD]"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (mfaRequired) resetMfaChallenge();
              }}
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
          </>
        ) : (
          <>
            <div className="mb-4 rounded-lg border border-[#3BE3FD]/30 bg-[#3BE3FD]/10 px-4 py-3 text-sm text-[#3BE3FD]">
              Пароль подтверждён. Требуется второй фактор.
            </div>

            <div className="mb-3 text-sm text-white/70">
              Пользователь: <span className="text-white">{email}</span>
            </div>

            <div className="mb-4 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70">
              {mfaHelperText}
            </div>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={
                mfaMethod === "email"
                  ? "Введите email-код"
                  : "Введите код Google Authenticator"
              }
              required
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-2 focus:outline-none focus:border-[#3BE3FD] tracking-widest text-center text-lg"
              value={mfaCode}
              onChange={(e) => setMfaCode(sanitizeMfaCode(e.target.value))}
            />

            <div className="mb-6 text-center text-xs text-white/40">
              Обычно код состоит из 6 цифр.
            </div>
          </>
        )}

        <button
          disabled={loading}
          className="w-full py-3 bg-[#0052FF] rounded-lg text-white font-semibold disabled:opacity-50 hover:bg-[#1f6bff] transition"
        >
          {loading
            ? mfaRequired
              ? "Проверка MFA..."
              : "Авторизация..."
            : mfaRequired
              ? "Подтвердить MFA"
              : "Войти"}
        </button>

        {mfaRequired ? (
          <button
            type="button"
            onClick={resetMfaChallenge}
            className="mt-4 w-full text-sm text-white/60 hover:text-white transition"
            disabled={loading}
          >
            Вернуться к вводу логина и пароля
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePasswordReset}
            className="mt-4 w-full text-sm text-[#3BE3FD] hover:text-white transition"
          >
            Забыли пароль?
          </button>
        )}

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