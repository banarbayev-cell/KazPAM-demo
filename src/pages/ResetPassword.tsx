import { Link, useSearchParams } from "react-router-dom";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");

  return (
    <div className="h-screen w-full bg-[#0A0F24] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 text-white">
        <h1 className="text-2xl font-bold text-center mb-3">
          Сброс пароля
        </h1>

        <p className="text-sm text-white/70 text-center mb-4">
          В текущем процессе KazPAM сброс пароля выполняется не по ссылке, а через
          отправку временного пароля на email.
        </p>

        {token && (
          <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            Эта ссылка больше не используется в текущем сценарии восстановления пароля.
          </div>
        )}

        <div className="rounded-lg bg-[#0E1A3A] border border-[#1E2A45] p-4 text-sm text-gray-300 space-y-2 mb-6">
          <p>Как работает восстановление:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Запросите восстановление пароля.</li>
            <li>Получите временный пароль на email.</li>
            <li>Войдите в систему.</li>
            <li>Система автоматически потребует установить новый пароль.</li>
          </ol>
        </div>

        <div className="space-y-3">
          <Link
            to="/forgot-password"
            className="block w-full text-center py-3 rounded-lg bg-[#0052FF] font-semibold hover:bg-[#1f6bff] transition"
          >
            Запросить временный пароль
          </Link>

          <Link
            to="/login"
            className="block w-full text-center py-3 rounded-lg bg-white/10 border border-white/20 font-semibold hover:bg-white/15 transition"
          >
            Вернуться ко входу
          </Link>
        </div>
      </div>
    </div>
  );
}