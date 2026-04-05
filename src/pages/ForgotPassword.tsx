import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Введите корректный email");
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      setSent(true);
    } catch {
      setError("Не удалось отправить письмо. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="h-screen w-full bg-[#0A0F24] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 text-white">
          <h1 className="text-2xl font-bold text-center mb-3">
            Проверьте почту
          </h1>

          <p className="text-sm text-white/70 text-center mb-6">
            Если такой email зарегистрирован, мы отправили временный пароль.
            После входа система попросит вас установить новый безопасный пароль.
          </p>

          <Link
            to="/login"
            className="block w-full text-center py-3 rounded-lg bg-[#0052FF] font-semibold hover:bg-[#1f6bff] transition"
          >
            Вернуться ко входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0A0F24] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 text-white">
        <h1 className="text-3xl font-bold text-center mb-2">
          Восстановление пароля
        </h1>

        <p className="text-center text-sm text-white/60 mb-6">
          Укажите email. Если аккаунт существует, мы отправим временный пароль.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#3BE3FD]"
          />

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#0052FF] rounded-lg text-white font-semibold disabled:opacity-50 hover:bg-[#1f6bff] transition"
          >
            {loading ? "Отправка..." : "Отправить временный пароль"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm">
          <Link to="/login" className="text-[#3BE3FD] hover:text-white transition">
            ← Назад ко входу
          </Link>
        </div>
      </div>
    </div>
  );
}