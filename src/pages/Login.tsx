import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { API_URL } from "../api/config";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuth((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
        throw new Error("Неверный логин или пароль");
      }

      const data = await response.json();

      if (!data.access_token) {
        throw new Error("Токен не получен от сервера");
      }

      // ✅ ЕДИНСТВЕННЫЙ источник JWT
      login(data.access_token);

      // ✅ Явный переход в dashboard
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      alert(err.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#0A0F24] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0052FF]/20 via-[#3BE3FD]/10 to-[#0A0F24] opacity-60 blur-3xl" />

      <form
        onSubmit={handleLogin}
        className="relative z-10 w-[420px] p-10 rounded-2xl shadow-2xl bg-white/5 backdrop-blur-xl border border-white/10"
      >
        <h1 className="text-4xl font-extrabold text-center text-white mb-4">
          Kaz<span className="text-[#0052FF]">PAM</span>
        </h1>

        <p className="text-center text-[#C9D1E7] mb-6 text-sm tracking-wide">
          Privileged Access Management System
        </p>

        <input
          type="email"
          placeholder="E-mail"
          required
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-4 outline-none focus:border-[#0052FF]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Пароль"
          required
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-6 outline-none focus:border-[#0052FF]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full py-3 bg-[#0052FF] rounded-lg text-white font-semibold text-lg tracking-wide hover:bg-[#003ECD] transition-all shadow-lg disabled:opacity-50"
        >
          {loading ? "Вход..." : "Войти"}
        </button>

        <p className="text-center text-[#C9D1E7] text-xs mt-6">
          Made in <span className="text-[#3BE3FD] font-bold">Kazakhstan</span>
        </p>
      </form>
    </div>
  );
}
