import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import MiniSecretActivityChart from "../charts/MiniSecretActivityChart";
import StatusChip from "../StatusChip";

type AnyRow = Record<string, any>;

type NormalizedRow = {
  time: string;
  user: string;
  action: string;
  ip: string;
  status: string;
};

function formatTs(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(+d)) return "—";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

function humanizeAction(actionRaw?: string): string {
  const a = String(actionRaw ?? "").trim().toUpperCase();
  if (!a) return "—";

  // Vault actions (не ломаем: если другое — покажем как есть)
  const map: Record<string, string> = {
    CREATE: "Создание секрета",
    UPDATE: "Обновление секрета",
    ROTATE: "Ротация секрета",
    REVEAL: "Просмотр секрета",
    COPY: "Копирование секрета",
    DELETE: "Удаление секрета",

    REQUEST: "Запрос доступа",
    APPROVE: "Одобрение доступа",
    DENY: "Отклонение доступа",
    CANCEL: "Отмена запроса",
  };

  return map[a] ?? String(actionRaw);
}

function normalizeStatus(statusRaw?: string): string {
  const raw = String(statusRaw ?? "").trim();
  if (!raw) return "—";

  const upper = raw.toUpperCase();

  // Нормализация RU → EN (best-effort)
  if (upper.includes("УСПЕШ") || upper === "OK") return "SUCCESS";
  if (upper.includes("ОТКЛОН") || upper.includes("DENY")) return "DENIED";
  if (upper.includes("ОШИБ") || upper.includes("FAIL") || upper.includes("ERROR"))
    return "FAILED";

  return raw;
}

function normalizeRow(row: AnyRow): NormalizedRow {
  // time: либо готовая строка, либо ISO timestamp
  const time =
    (typeof row.time === "string" && row.time) ||
    formatTs(row.timestamp || row.created_at || row.updated_at);

  const user =
    (typeof row.user === "string" && row.user) ||
    (typeof row.actor === "string" && row.actor) ||
    (typeof row.email === "string" && row.email) ||
    "—";

  const action = humanizeAction(row.action);

  const ip =
    (typeof row.ip === "string" && row.ip) ||
    (typeof row.source_ip === "string" && row.source_ip) ||
    "—";

  const status = normalizeStatus(row.status);

  return { time, user, action, ip, status };
}

export default function VaultHistoryPanel({
  open,
  onClose,
  system,
  login,
  updated,
  type,
  history,
  onInvestigate,
  onRestrict,
}: any) {
  // Хуки должны вызываться всегда (без условного return до хуков)
  const [tab, setTab] = useState<"history" | "ai" | "risk" | "files">("history");

  // Сохранить ожидаемое поведение: при открытии панели возвращаемся на "История"
  useEffect(() => {
    if (open) setTab("history");
  }, [open]);

  const historyData: NormalizedRow[] = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history.map((row: AnyRow) => normalizeRow(row));
  }, [history]);

  if (!open) return null;

  const tabButton = (key: "history" | "ai" | "risk" | "files", label: string) => (
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
          <p>
            <b className="text-white">Логин:</b> {login ?? "—"}
          </p>
          <p>
            <b className="text-white">Последняя ротация:</b> {updated ?? "—"}
          </p>
          <p>
            <b className="text-white">Тип доступа:</b> {type ?? "—"}
          </p>
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

            {historyData.length === 0 ? (
              <div className="text-sm text-[var(--text-secondary)]">
                Пока нет событий. История появится после действий CREATE/REVEAL/COPY и т.д.
              </div>
            ) : (
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
                    {historyData.map((row, index) => (
                      <tr key={index} className="border-t border-[#1e2a4a]">
                        <td className="py-2 whitespace-nowrap">{row.time}</td>
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
            )}
          </div>
        )}

        {/* AI TAB */}
        {tab === "ai" && (
          <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-[var(--neon)] mb-3">AI-анализ угроз</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-6">
              Этот блок v1 — интерфейс под аналитику. Реальные выводы будем строить на истории Vault
              (REVEAL/COPY/REQUEST + контекст IP/времени).
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
            <p className="text-[var(--text-secondary)] text-sm">
              Риск-скоринг v1 будет учитывать частоту REVEAL/COPY, необычные IP/время, и отклонения по пользователю.
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
          <button
            onClick={onInvestigate}
            className="bg-[#0052FF] hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold"
          >
            Открыть расследование
          </button>

          <button
            onClick={onRestrict}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-semibold"
          >
            Ограничить доступ
          </button>
        </div>
      </div>
    </div>
  );
}