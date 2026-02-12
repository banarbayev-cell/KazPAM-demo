import { useState } from "react";
import { api } from "../../services/api";


type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function PasswordResetModal({ isOpen, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"form" | "sent">("form");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/password-reset/request", { email });
      setStage("sent");
    } catch {
      // intentionally ignore — security
      setStage("sent");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50">
      <div className="bg-[#121A33] w-[420px] rounded-xl p-6 border border-[#1E2A45]">

        {stage === "form" && (
          <>
            <h2 className="text-xl font-semibold text-white mb-2">
              Восстановление пароля
            </h2>
            <p className="text-gray-400 mb-4 text-sm">
              Введите корпоративную почту. Мы отправим инструкции.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@company.com"
                className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
              />

              <button
                disabled={loading}
                className="w-full bg-[#0052FF] hover:bg-[#0041cc] transition rounded-lg py-2 text-white font-medium"
              >
                {loading ? "Отправка..." : "Отправить"}
              </button>
            </form>
          </>
        )}

        {stage === "sent" && (
          <>
            <h2 className="text-xl font-semibold text-white mb-3">
              Проверьте почту
            </h2>

            <div className="text-gray-300 text-sm space-y-2">
              <p>
                Если аккаунт существует — вы получите письмо со ссылкой
                для смены пароля.
              </p>

              <p className="text-gray-500">
                Письмо может идти до 2 минут.
              </p>
            </div>

            <button
              onClick={onClose}
              className="mt-5 w-full bg-[#1E2A45] hover:bg-[#26345c] rounded-lg py-2 text-white"
            >
              Понятно
            </button>
          </>
        )}

      </div>
    </div>
  );
}
