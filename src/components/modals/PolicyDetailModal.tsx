import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatToAlmaty } from "../../utils/time";

export default function PolicyDetailModal({ open, policy, onClose }: any) {
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] =
    useState<"params" | "roles" | "history">("params");

  // Всегда сбрасываем вкладку при открытии
  useEffect(() => {
    if (open) {
      setActiveTab("params");
    }
  }, [open]);

  // Подгружаем историю корректно
  useEffect(() => {
    if (open && policy?.id) {
      fetch(`http://127.0.0.1:8000/policies/${policy.id}/history`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setHistory(data);
          } else {
            console.error("History is not array:", data);
            setHistory([]);
          }
        })
        .catch((err) => {
          console.error("Ошибка загрузки истории:", err);
          setHistory([]);
        });
    }
  }, [open, policy]);

  if (!open || !policy) return null;

  // UI данные
  const roles = ["Admin", "DevOps", "Security Team"]; // временно

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[99999]">
      <div className="w-[780px] max-h-[92vh] overflow-y-auto bg-[#0F172A] text-white rounded-xl shadow-2xl border border-white/10 p-6">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              Политика: <span className="text-[#3BE3FD]">{policy.name}</span>
            </h2>
            <p className="text-gray-400 mt-1">Тип: {policy.type}</p>
          </div>

          <button onClick={onClose} className="text-gray-300 hover:text-white">
            <X size={26} />
          </button>
        </div>

        {/* STATUS */}
        <div className="mb-6">
          {policy.status === "active" ? (
            <span className="px-3 py-1 bg-green-700 rounded-full text-xs font-bold">
              Активна
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-700 rounded-full text-xs font-bold">
              Отключена
            </span>
          )}
          <p className="mt-2 text-gray-400 text-sm">
            Обновлена: {policy.updated_at}
          </p>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-6 border-b border-white/10 pb-2">
          <button
            className={`pb-2 text-lg ${
              activeTab === "params"
                ? "text-[#3BE3FD] border-b-2 border-[#3BE3FD]"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("params")}
          >
            Параметры
          </button>

          <button
            className={`pb-2 text-lg ${
              activeTab === "roles"
                ? "text-[#3BE3FD] border-b-2 border-[#3BE3FD]"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("roles")}
          >
            Роли и группы
          </button>

          <button
            className={`pb-2 text-lg ${
              activeTab === "history"
                ? "text-[#3BE3FD] border-b-2 border-[#3BE3FD]"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("history")}
          >
            История изменений
          </button>
        </div>

        {/* TAB CONTENT */}

        {/* ПАРАМЕТРЫ */}
        {activeTab === "params" && (
  <div>
    <h3 className="text-xl font-bold mb-4">Параметры политики</h3>

    <div className="bg-[#1E293B] p-4 rounded-lg border border-white/10 grid grid-cols-2 gap-6">

      {/* MFA */}
      <div>
        <div className="text-gray-400 text-sm">MFA требуется</div>
        <div className="mt-1 font-semibold">
          {policy.mfa_required ? (
            <span className="px-3 py-1 bg-green-700/50 text-green-300 rounded-full text-xs">
              Да
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-700/50 text-red-300 rounded-full text-xs">
              Нет
            </span>
          )}
        </div>
      </div>

      {/* Окно доступа */}
      <div>
        <div className="text-gray-400 text-sm">Окно доступа</div>
        <div className="mt-1 font-semibold">
          {policy.time_start} — {policy.time_end}
        </div>
      </div>

      {/* IP диапазон */}
      <div>
        <div className="text-gray-400 text-sm">Разрешённый диапазон IP</div>
        <div className="mt-1 font-semibold">{policy.ip_range}</div>
      </div>

      {/* Лимит сессии */}
      <div>
        <div className="text-gray-400 text-sm">Лимит сессии</div>
        <div className="mt-1 font-semibold">{policy.session_limit} минут</div>
      </div>

    </div>
  </div>
)}

        {/* РОЛИ */}
        {activeTab === "roles" && (
          <div>
            <h3 className="text-xl font-bold mb-3">Связанные роли и группы</h3>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <span
                  key={r}
                  className="px-3 py-1 bg-[#1E293B] rounded-full border border-white/10 text-sm"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ИСТОРИЯ */}
        {activeTab === "history" && (
          <div className="max-h-[400px] overflow-y-auto pr-2">
            <h3 className="text-xl font-bold mb-3">История изменений</h3>

            <div className="bg-[#1E293B] rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-white/10">
                    <th className="p-3 text-left">Дата</th>
                    <th className="p-3 text-left">Действие</th>
                    <th className="p-3 text-left">Пользователь</th>
                  </tr>
                </thead>

                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-3 text-gray-500">
                        История пока отсутствует
                      </td>
                    </tr>
                  ) : (
                    history.map((h: any) => (
                      <tr
                        key={h.id}
                        className="border-b border-white/5 hover:bg-[#0E1A3A]"
                      >
                        <td className="p-3">{formatToAlmaty(h.timestamp)}</td>
                        <td className="p-3">{h.details}</td>
                        <td className="p-3">{h.user}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
