import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import MiniSecretActivityChart from "../charts/MiniSecretActivityChart";
import StatusChip from "../StatusChip";

type AnyRow = Record<string, any>;

type NormalizedRow = {
  time: string;
  user: string;
  action: string;
  rawAction: string;
  ip: string;
  status: string;
};

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type VaultRiskAnalysis = {
  score: number;
  level: RiskLevel;
  levelLabel: string;
  levelClass: string;
  summary: string;
  counts: {
    total: number;
    reveal: number;
    copy: number;
    request: number;
    approve: number;
    grant: number;
    restrict: number;
    unrestrict: number;
    failed: number;
    update: number;
    rotate: number;
    uniqueUsers: number;
    uniqueIps: number;
  };
  reasons: string[];
  recommendations: string[];
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

  const map: Record<string, string> = {
    CREATE: "Создание секрета",
    UPDATE: "Обновление секрета",
    ROTATE: "Ротация секрета",
    ROTATION_SETTINGS_UPDATE: "Изменение настроек ротации",
    ROTATE_FAIL: "Ошибка ротации",
    ROTATION_SUCCESS: "Успешная ротация",
    REVEAL: "Просмотр секрета",
    COPY: "Копирование секрета",
    DELETE: "Удаление секрета",

    RESTRICT: "Ограничение доступа",
    UNRESTRICT: "Восстановление доступа",
    VAULT_SECRET_RESTRICT: "Ограничение доступа",
    VAULT_SECRET_UNRESTRICT: "Восстановление доступа",

    REQUEST: "Запрос доступа",
    APPROVE: "Одобрение доступа",
    DENY: "Отклонение доступа",
    CANCEL: "Отмена запроса",

    REQUEST_CREATE: "Создание запроса",
    REQUEST_APPROVE: "Одобрение запроса",
    REQUEST_DENY: "Отклонение запроса",
    REQUEST_CANCEL: "Отмена запроса",
    GRANT_CREATE: "Выдача grant",
    REVEAL_APPROVED: "Просмотр по grant",
  };

  return map[a] ?? String(actionRaw);
}

function normalizeStatus(statusRaw?: string): string {
  const raw = String(statusRaw ?? "").trim();
  if (!raw) return "—";

  const upper = raw.toUpperCase();

  if (upper.includes("УСПЕШ") || upper === "OK") return "SUCCESS";
  if (upper.includes("ОТКЛОН") || upper.includes("DENY")) return "DENIED";
  if (
    upper.includes("ОШИБ") ||
    upper.includes("FAIL") ||
    upper.includes("ERROR")
  ) {
    return "FAILED";
  }

  return raw;
}

function normalizeRow(row: AnyRow): NormalizedRow {
  const rawAction = String(row.action ?? "").trim();

  const time =
    (typeof row.time === "string" && row.time) ||
    formatTs(row.timestamp || row.created_at || row.updated_at);

  const user =
    (typeof row.user === "string" && row.user) ||
    (typeof row.actor === "string" && row.actor) ||
    (typeof row.email === "string" && row.email) ||
    "—";

  const action = humanizeAction(rawAction);

  const ip =
    (typeof row.ip === "string" && row.ip) ||
    (typeof row.source_ip === "string" && row.source_ip) ||
    "—";

  const status = normalizeStatus(row.status);

  return { time, user, action, rawAction, ip, status };
}

function actionIncludes(row: NormalizedRow, pattern: string): boolean {
  const raw = row.rawAction.toUpperCase();
  const human = row.action.toUpperCase();
  const p = pattern.toUpperCase();

  return raw.includes(p) || human.includes(p);
}

function calculateVaultRisk(
  historyData: NormalizedRow[],
  restricted: boolean
): VaultRiskAnalysis {
  const users = new Set(
    historyData
      .map((r) => r.user)
      .filter((u) => u && u !== "—")
  );

  const ips = new Set(
    historyData
      .map((r) => r.ip)
      .filter((ip) => ip && ip !== "—")
  );

  const counts = {
    total: historyData.length,
    reveal: historyData.filter((r) => actionIncludes(r, "REVEAL") || r.action.includes("Просмотр")).length,
    copy: historyData.filter((r) => actionIncludes(r, "COPY") || r.action.includes("Копирование")).length,
    request: historyData.filter((r) => actionIncludes(r, "REQUEST") || r.action.includes("Запрос")).length,
    approve: historyData.filter((r) => actionIncludes(r, "APPROVE") || r.action.includes("Одобр")).length,
    grant: historyData.filter((r) => actionIncludes(r, "GRANT")).length,
    restrict: historyData.filter((r) => actionIncludes(r, "RESTRICT") && !actionIncludes(r, "UNRESTRICT")).length,
    unrestrict: historyData.filter((r) => actionIncludes(r, "UNRESTRICT")).length,
    failed: historyData.filter((r) => {
      const s = r.status.toUpperCase();
      return s.includes("FAIL") || s.includes("ERROR") || actionIncludes(r, "FAIL");
    }).length,
    update: historyData.filter((r) => actionIncludes(r, "UPDATE") || r.action.includes("Обновление")).length,
    rotate: historyData.filter((r) => actionIncludes(r, "ROTATE") || r.action.includes("Ротация")).length,
    uniqueUsers: users.size,
    uniqueIps: ips.size,
  };

  let score = 0;
  const reasons: string[] = [];
  const recommendations: string[] = [];

  if (restricted) {
    score += 35;
    reasons.push("Секрет сейчас находится в статусе Restricted.");
    recommendations.push("Проверьте причину ограничения и восстановите доступ только после проверки SOC/администратором.");
  }

  if (counts.failed > 0) {
    const add = Math.min(25, counts.failed * 10);
    score += add;
    reasons.push(`Есть неуспешные или ошибочные события: ${counts.failed}.`);
    recommendations.push("Проверьте ошибки доступа, ротации или неуспешные попытки операций с секретом.");
  }

  if (counts.reveal >= 3) {
    score += 15;
    reasons.push(`Секрет раскрывался несколько раз: ${counts.reveal}.`);
    recommendations.push("Проверьте, все ли просмотры секрета были обоснованы и связаны с рабочими задачами.");
  } else if (counts.reveal > 0) {
    score += 5;
    reasons.push(`Есть просмотры секрета: ${counts.reveal}.`);
  }

  if (counts.copy >= 2) {
    score += 15;
    reasons.push(`Секрет копировался несколько раз: ${counts.copy}.`);
    recommendations.push("Сократите ручное копирование секрета, где возможно используйте JIT/PAM-сессию.");
  } else if (counts.copy > 0) {
    score += 5;
    reasons.push(`Есть копирование секрета: ${counts.copy}.`);
  }

  if (counts.request >= 3) {
    score += 10;
    reasons.push(`По секрету было несколько запросов доступа: ${counts.request}.`);
  }

  if (counts.restrict > 0) {
    score += 20;
    reasons.push(`По секрету применялось ограничение доступа: ${counts.restrict}.`);
    recommendations.push("Проверьте историю Restrict/Unrestrict и убедитесь, что восстановление доступа было согласовано.");
  }

  if (counts.unrestrict > 0) {
    score += 10;
    reasons.push(`Доступ к секрету восстанавливался: ${counts.unrestrict}.`);
  }

  if (counts.uniqueUsers >= 3) {
    score += 10;
    reasons.push(`С секретом работали разные пользователи: ${counts.uniqueUsers}.`);
    recommendations.push("Проверьте, соответствует ли число пользователей принципу минимально необходимых прав.");
  }

  if (counts.uniqueIps >= 3) {
    score += 10;
    reasons.push(`Действия выполнялись с разных IP-адресов: ${counts.uniqueIps}.`);
    recommendations.push("Проверьте IP-адреса и исключите нетипичные источники доступа.");
  }

  if (counts.update > 0) {
    score += 5;
    reasons.push(`Секрет обновлялся: ${counts.update}.`);
  }

  if (counts.rotate > 0) {
    score = Math.max(0, score - 5);
    reasons.push(`Есть события ротации секрета: ${counts.rotate}.`);
  }

  score = Math.max(0, Math.min(100, score));

  let level: RiskLevel = "LOW";
  let levelLabel = "Низкий";
  let levelClass = "bg-green-500/20 text-green-300 border-green-500/30";

  if (score >= 80) {
    level = "CRITICAL";
    levelLabel = "Критический";
    levelClass = "bg-red-500/20 text-red-300 border-red-500/30";
  } else if (score >= 60) {
    level = "HIGH";
    levelLabel = "Высокий";
    levelClass = "bg-orange-500/20 text-orange-300 border-orange-500/30";
  } else if (score >= 30) {
    level = "MEDIUM";
    levelLabel = "Средний";
    levelClass = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
  }

  let summary = "Активность по секрету выглядит штатно. Критичных признаков риска по текущей истории не выявлено.";

  if (historyData.length === 0) {
    summary = "По секрету пока нет достаточной истории для анализа риска.";
  } else if (restricted) {
    summary = "Секрет ограничен. Это означает, что SOC или администратор заблокировал операции раскрытия, копирования и JIT-доступа до выяснения причины.";
  } else if (level === "CRITICAL") {
    summary = "По секрету обнаружена критичная совокупность факторов риска. Рекомендуется расследование и временное ограничение доступа.";
  } else if (level === "HIGH") {
    summary = "По секрету есть повышенные признаки риска. Рекомендуется проверить историю доступа, пользователей и IP-адреса.";
  } else if (level === "MEDIUM") {
    summary = "По секрету есть умеренная активность. Рекомендуется периодический контроль и проверка обоснованности доступов.";
  }

  if (reasons.length === 0) {
    reasons.push("Нет негативных событий в текущей истории секрета.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Продолжить мониторинг. При необходимости использовать JIT-доступ вместо ручного раскрытия секрета.");
  }

  return {
    score,
    level,
    levelLabel,
    levelClass,
    summary,
    counts,
    reasons,
    recommendations,
  };
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[#1E2A45] bg-[#121A33] p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

export default function VaultHistoryPanel({
  open,
  onClose,
  system,
  login,
  updated,
  type,
  restricted,
  history,
  onInvestigate,
  onRestrict,
  onLiftRestriction,
}: any) {
  const [tab, setTab] = useState<"history" | "ai" | "risk" | "files">(
    "history"
  );

  useEffect(() => {
    if (open) setTab("history");
  }, [open]);

  const historyData: NormalizedRow[] = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history.map((row: AnyRow) => normalizeRow(row));
  }, [history]);

  const riskAnalysis = useMemo(() => {
    return calculateVaultRisk(historyData, Boolean(restricted));
  }, [historyData, restricted]);

  if (!open) return null;

  const tabButton = (
    key: "history" | "ai" | "risk" | "files",
    label: string
  ) => (
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

          <p>
            <b className="text-white">Статус:</b>{" "}
            {restricted ? (
              <span className="text-red-300">Restricted</span>
            ) : (
              <span className="text-green-300">Active</span>
            )}
          </p>

          <p>
            <b className="text-white">Risk:</b>{" "}
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${riskAnalysis.levelClass}`}
            >
              {riskAnalysis.score}/100 · {riskAnalysis.levelLabel}
            </span>
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
            <h3 className="text-lg font-semibold text-white mb-3">
              Журнал действий
            </h3>

            {historyData.length === 0 ? (
              <div className="text-sm text-[var(--text-secondary)]">
                Пока нет событий. История появится после действий
                CREATE/REVEAL/COPY и т.д.
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
          <div className="space-y-4 mb-6">
            <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--neon)] mb-2">
                    AI-анализ угроз
                  </h3>

                  <p className="text-[var(--text-secondary)] text-sm leading-6">
                    {riskAnalysis.summary}
                  </p>
                </div>

                <span
                  className={`shrink-0 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${riskAnalysis.levelClass}`}
                >
                  {riskAnalysis.level}
                </span>
              </div>

              <div className="mt-4">
                <MiniSecretActivityChart />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Всего событий" value={riskAnalysis.counts.total} />
              <MetricCard label="Пользователей" value={riskAnalysis.counts.uniqueUsers} />
              <MetricCard label="Просмотров" value={riskAnalysis.counts.reveal} />
              <MetricCard label="Копирований" value={riskAnalysis.counts.copy} />
              <MetricCard label="Запросов доступа" value={riskAnalysis.counts.request} />
              <MetricCard label="Ограничений" value={riskAnalysis.counts.restrict} />
            </div>

            <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-3">
                Выводы по активности
              </h4>

              <ul className="space-y-2 text-sm text-gray-300">
                {riskAnalysis.reasons.map((reason, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-[#3BE3FD]">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-3">
                Рекомендации
              </h4>

              <ul className="space-y-2 text-sm text-gray-300">
                {riskAnalysis.recommendations.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-green-300">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* RISK TAB */}
        {tab === "risk" && (
          <div className="space-y-4 mb-6">
            <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Риск-скоринг
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Rule-based v1: оценка строится по истории Vault-событий.
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${riskAnalysis.levelClass}`}
                >
                  {riskAnalysis.score}/100 · {riskAnalysis.levelLabel}
                </span>
              </div>

              <div className="h-3 w-full rounded-full bg-[#121A33] overflow-hidden border border-[#1E2A45]">
                <div
                  className="h-full bg-[#0052FF] transition-all"
                  style={{ width: `${riskAnalysis.score}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Reveal"
                value={riskAnalysis.counts.reveal}
                hint="Просмотры секрета"
              />
              <MetricCard
                label="Copy"
                value={riskAnalysis.counts.copy}
                hint="Копирования секрета"
              />
              <MetricCard
                label="Requests"
                value={riskAnalysis.counts.request}
                hint="Запросы доступа"
              />
              <MetricCard
                label="Approvals"
                value={riskAnalysis.counts.approve}
                hint="Одобрения доступа"
              />
              <MetricCard
                label="Restrict"
                value={riskAnalysis.counts.restrict}
                hint="Ограничения доступа"
              />
              <MetricCard
                label="Failed"
                value={riskAnalysis.counts.failed}
                hint="Ошибки/неуспешные события"
              />
            </div>

            <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-3">
                Факторы риска
              </h4>

              <ul className="space-y-2 text-sm text-gray-300">
                {riskAnalysis.reasons.map((reason, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-[#3BE3FD]">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* FILES TAB */}
        {tab === "files" && (
          <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              Файлы расследования
            </h3>

            <p className="text-[var(--text-secondary)] text-sm leading-6">
              Материалы расследования по этому секрету пока не прикреплены.
              В следующих версиях здесь можно будет отображать экспорт audit,
              session recording, скриншоты, отчёты SOC и связанные incident-файлы.
            </p>

            <div className="mt-4 rounded-lg border border-[#1E2A45] bg-[#121A33] p-3 text-sm text-gray-400">
              Статус: нет прикреплённых материалов.
            </div>
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

          {restricted ? (
            onLiftRestriction && (
              <button
                onClick={onLiftRestriction}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold"
              >
                Восстановить доступ
              </button>
            )
          ) : (
            onRestrict && (
              <button
                onClick={onRestrict}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-semibold"
              >
                Ограничить доступ
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}