import { X } from "lucide-react";
import { useState } from "react";
import MiniSecretActivityChart from "../charts/MiniSecretActivityChart";
import StatusChip from "../StatusChip";

export default function VaultHistoryPanel({
  open,
  onClose,
  system,
  login,
  updated,
  type,
  history,
  onInvestigate,
  onRestrict
}: any) {
  
  if (!open) return null;

  const [tab, setTab] = useState("history");

  const defaultHistory = [
    { time: "10:22", user: "admin", action: "Просмотр секретов", ip: "192.168.1.1", status: "Успешно" },
    { time: "10:15", user: "root", action: "Смена пароля", ip: "10.0.0.5", status: "Отклонено" },
  ];

  const historyData = history ?? defaultHistory;

  const tabButton = (key: string, label: string) => (
    <button
      onClick={() => setTab(key)}
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
        tab === key
          ? "bg-[var(--accent)] text-white"
          : "text-[var(--text-secondary)] hover:bg-[#0E1A3A]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-end z-[999]">
      <div className="vault-side-panel bg-[#121A33] text-white h-full shadow-2xl p-6 overflow-y-auto border-l border-[var(--border)] animate-slideInRight">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{system ?? "—"}</h2>
          <button onClick={onClose} className="hover:text-red-400 transition">
            <X size={26} />
          </button>
        </div>

        {/* META INFO */}
        <div className="text-sm text-[var(--text-secondary)] space-y-1 mb-6">
          <p><b className="text-white">Логин:</b> {login ?? "—"}</p>
          <p><b className="text-white">Последняя ротация:</b> {updated ?? "—"}</p>
          <p><b className="text-white">Тип доступа:</b> {type ?? "—"}</p>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6">
          {tabButton("history", "История")}
          {tabButton("ai", "AI-анализ")}
          {tabButton("risk", "Риск-скоринг")}
          {tabButton("files", "Файлы")}
        </div>

        {/* HISTORY TAB */}
        {tab === "history" && (
          <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Журнал действий</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-gray-300">
                  <tr>
                    <th className="py-2">Время</th>
                    <th className="py-2">Пользователь</th>
                    <th className="py-2">Действие</th>
                    <th className="py-2">IP</th>
                    <th className="py-2">Статус</th>
                  </tr>
                </thead>

                <tbody className="text-gray-200">
                  {historyData.map((row: any, index: number) => (
                    <tr key={index} className="border-t border-[#1e2a4a]">
                      <td className="py-2">{row.time}</td>
                      <td className="py-2">{row.user}</td>
                      <td className="py-2">{row.action}</td>
                      <td className="py-2 whitespace-nowrap">{row.ip}</td>
                      <td className="py-2">
                        <StatusChip status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI TAB */}
        {tab === "ai" && (
          <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-[var(--neon)] mb-3">AI-анализ угроз</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-6">
              Аналитика выявила рост активности команд на <b className="text-white">360%</b>.
              Возможная компрометация учётной записи <b className="text-white">root</b>.
            </p>
            <div className="mt-4">
              <MiniSecretActivityChart />
            </div>
          </div>
        )}

        {/* RISK TAB */}
        {tab === "risk" && (
          <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Риск-скоринг</h3>
            <p className="text-lg font-bold text-red-400">82 / 100 — высокий риск</p>
            <p className="text-[var(--text-secondary)] mt-2 text-sm">
              Поведение пользователя отклоняется от нормы. Требуется проверка.
            </p>
          </div>
        )}

        {/* FILES TAB */}
        {tab === "files" && (
          <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Файлы расследования</h3>
            <p className="text-[var(--text-secondary)] text-sm">Пока нет материалов.</p>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex justify-between gap-4 mt-4 sticky bottom-4 bg-[#121A33] pt-4">
          <button onClick={onInvestigate} className="bg-[#0052FF] hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold">
            Открыть расследование
          </button>

          <button onClick={onRestrict} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-semibold">
            Ограничить доступ
          </button>
        </div>

      </div>
    </div>
  );
}
