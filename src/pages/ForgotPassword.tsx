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
    } catch (err: any) {
      setError("Не удалось отправить письмо. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded shadow">
        <h1 className="text-xl font-semibold mb-4">
          Проверьте почту
        </h1>
        <p className="text-gray-600 mb-6">
          Если такой email зарегистрирован, мы отправили инструкции
          по восстановлению пароля.
        </p>

        <Link
          to="/login"
          className="text-blue-600 hover:underline text-sm"
        >
          ← Вернуться к входу
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded shadow">
      <h1 className="text-xl font-semibold mb-4">
        Восстановление пароля
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? "Отправка..." : "Отправить письмо"}
        </button>
      </form>

      <div className="mt-4 text-sm">
        <Link to="/login" className="text-blue-600 hover:underline">
          ← Назад к входу
        </Link>
      </div>
    </div>
  );
}
