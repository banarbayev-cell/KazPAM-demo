import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ldapApi, LdapSyncLog, LdapSyncResult } from "@/api/ldap";

type LdapSyncCardProps = {
  disabled?: boolean;
  disabledReason?: string;
};

export default function LdapSyncCard({
  disabled = false,
  disabledReason = "Сначала сохраните AD/LDAP настройки",
}: LdapSyncCardProps) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<LdapSyncResult | null>(null);
  const [logs, setLogs] = useState<LdapSyncLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    try {
      const res = await ldapApi.listSyncLogs();
      setLogs(res);
    } catch {
      toast.error("Не удалось загрузить LDAP sync logs");
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  const run = async (mode: "sync" | "dry-run") => {
    if (disabled) {
      toast.error(disabledReason);
      return;
    }

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast.error("Укажите email пользователя");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res =
        mode === "sync"
          ? await ldapApi.syncUser(normalizedEmail)
          : await ldapApi.dryRunSyncUser(normalizedEmail);

      setResult(res);
      toast.success(mode === "sync" ? "LDAP sync выполнен" : "LDAP проверка выполнена");
      await loadLogs();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка LDAP sync");
    } finally {
      setLoading(false);
    }
  };

  const details =
    result?.details && typeof result.details === "object" ? result.details : null;

  return (
    <div className="bg-[#0E1A3A] border border-white/10 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-white font-semibold">Проверка и синхронизация LDAP</h3>
          <p className="text-xs text-gray-500 mt-1">
            Использует только сохранённые AD/LDAP настройки.
          </p>
        </div>

        {disabled && (
          <span className="shrink-0 text-[11px] px-2 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-200">
            Требуется сохранение
          </span>
        )}
      </div>

      {disabled && (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          {disabledReason}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled || loading}
          placeholder="user@company.local"
          className="flex-1 bg-[#121A33] border border-[#2A3B55] rounded-lg px-4 py-3 text-white placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <button
          onClick={() => run("dry-run")}
          disabled={disabled || loading}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition"
        >
          {loading ? "Проверка..." : "Проверка"}
        </button>

        <button
          onClick={() => run("sync")}
          disabled={disabled || loading}
          className="px-4 py-2 rounded-lg bg-[#0052FF] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition"
        >
          {loading ? "Синхронизация..." : "Синхронизировать"}
        </button>
      </div>

      {result && (
        <div className="mb-4 bg-[#121A33] border border-white/10 rounded-lg p-4 space-y-1">
          <div className="text-white text-sm">
            Результат: <span className="font-medium">{result.status}</span>
          </div>

          <div className="text-gray-400 text-sm">Email: {result.email}</div>

          <div className="text-gray-400 text-sm">
            Roles: {result.roles?.join(", ") || "—"}
          </div>

          <div className="text-gray-400 text-sm">
            Created: {result.created ? "Да" : "Нет"} · Updated:{" "}
            {result.updated ? "Да" : "Нет"} · Skipped:{" "}
            {result.skipped ? "Да" : "Нет"}
          </div>

          {details?.reason && (
            <div className="text-yellow-300 text-sm">Reason: {details.reason}</div>
          )}

          {details?.displayName && (
            <div className="text-gray-400 text-sm">
              DisplayName: {details.displayName}
            </div>
          )}

          {details?.department && (
            <div className="text-gray-400 text-sm">
              Department: {details.department}
            </div>
          )}

          {details?.title && (
            <div className="text-gray-400 text-sm">Title: {details.title}</div>
          )}

          {typeof details?.groups_count !== "undefined" && (
            <div className="text-gray-400 text-sm">
              Groups: {details.groups_count}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-[#121A33] border border-white/10 rounded-lg p-3"
          >
            <div className="text-white text-sm">
              #{log.id} · {log.mode} · {log.status}
            </div>

            <div className="text-gray-400 text-xs">
              {log.target_email || "—"} · {log.started_at}
            </div>
          </div>
        ))}

        {!logs.length && (
          <div className="text-sm text-gray-400">История sync пока пустая</div>
        )}
      </div>
    </div>
  );
}