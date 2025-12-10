import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuth((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      alert("Неверный логин или пароль");
      return;
    }

    const data = await response.json();

    // Сохраняем токен
    localStorage.setItem("access_token", data.access_token);

    // Обновляем Zustand store
    login(data.access_token);

    // Переход на Dashboard
    navigate("/dashboard");
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
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-4 outline-none focus:border-[#0052FF]"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Пароль"
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-6 outline-none focus:border-[#0052FF]"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full py-3 bg-[#0052FF] rounded-lg text-white font-semibold text-lg tracking-wide hover:bg-[#003ECD] transition-all shadow-lg hover:scale-[1.02] active:scale-95">
          Войти
        </button>

        <p className="text-center text-[#C9D1E7] text-xs mt-6">
          Made in <span className="text-[#3BE3FD] font-bold">Kazakhstan</span>
        </p>
      </form>
    </div>
  );
}
