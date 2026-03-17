import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listDiscoveryAccounts } from "../api/discovery";
import type { DiscoveredAccount } from "../types/discovery";

type ReadinessResult = {
  ready: boolean;
  reason: string;
};

function getReadiness(account: DiscoveredAccount): ReadinessResult {
  const missing: string[] = [];

  if (account.status !== "reviewed") {
    missing.push("не reviewed");
  }
  if (!account.owner?.trim()) {
    missing.push("не указан владелец");
  }
  if (!account.linked_vault_secret_id) {
    missing.push("не привязан Vault secret");
  }
  if (!account.linked_policy_id) {
    missing.push("не привязана политика");
  }

  if (missing.length === 0) {
    return {
      ready: true,
      reason: "готов к onboarding",
    };
  }

  return {
    ready: false,
    reason: missing.join(", "),
  };
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "managed":
      return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    case "reviewed":
      return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
    case "ignored":
      return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
    case "discovered":
    default:
      return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
  }
}

function readinessBadgeClass(ready: boolean) {
  return ready
    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
    : "bg-red-500/20 text-red-300 border border-red-500/30";
}

export default function Discovery() {
  const [accounts, setAccounts] = useState<DiscoveredAccount[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAccounts() {
    try {
      setLoading(true);
      const data = await listDiscoveryAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load discovery accounts", error);
      toast.error("Не удалось загрузить обнаруженные аккаунты");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  const stats = useMemo(() => {
    const total = accounts.length;
    const ready = accounts.filter((a) => getReadiness(a).ready).length;
    const managed = accounts.filter((a) => a.status === "managed").length;
    const reviewed = accounts.filter((a) => a.status === "reviewed").length;

    return { total, ready, managed, reviewed };
  }, [accounts]);

  return (
    <div className="min-h-full bg-gray-100 -m-6 p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Обнаруженные аккаунты
          </h1>
          <p className="text-gray-600 mt-2">
            Обнаруженные привилегированные аккаунты, metadata и готовность к onboarding.
          </p>
        </div>

        <button
          onClick={loadAccounts}
          className="px-4 py-2 rounded-lg bg-[#0052FF] text-white hover:opacity-90 transition"
        >
          Обновить
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-400">Всего аккаунтов</div>
          <div className="text-3xl font-bold mt-2">{stats.total}</div>
        </div>

        <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-400">Проверено</div>
          <div className="text-3xl font-bold mt-2">{stats.reviewed}</div>
        </div>

        <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-400">Готово к onboarding</div>
          <div className="text-3xl font-bold mt-2">{stats.ready}</div>
        </div>

        <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-400">Управляется</div>
          <div className="text-3xl font-bold mt-2">{stats.managed}</div>
        </div>
      </div>

      <div className="bg-[#121A33] rounded-2xl shadow overflow-hidden border border-[#1E2A45]">
        <div className="px-5 py-4 border-b border-[#1E2A45]">
          <h2 className="text-white text-lg font-semibold">Аккаунты</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0E1A3A] text-gray-300">
              <tr>
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">Аккаунт</th>
                <th className="text-left px-4 py-3 font-medium">Тип</th>
                <th className="text-left px-4 py-3 font-medium">Привилегия</th>
                <th className="text-left px-4 py-3 font-medium">Статус</th>
                <th className="text-left px-4 py-3 font-medium">Владелец</th>
                <th className="text-left px-4 py-3 font-medium">Секрет Vault</th>
                <th className="text-left px-4 py-3 font-medium">Политика</th>
                <th className="text-left px-4 py-3 font-medium">Готовность</th>
                <th className="text-left px-4 py-3 font-medium">Заметки</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Загрузка...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Обнаруженных аккаунтов пока нет
                  </td>
                </tr>
              ) : (
                accounts.map((account) => {
                  const readiness = getReadiness(account);

                  return (
                    <tr
                      key={account.id}
                      className="border-t border-[#1E2A45] text-gray-200 hover:bg-[#16213D] transition"
                    >
                      <td className="px-4 py-3">{account.id}</td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {account.account_name || "—"}
                        </div>
                        <div className="text-xs text-gray-400">
                          target_id: {account.target_id}
                        </div>
                      </td>

                      <td className="px-4 py-3">{account.account_type || "—"}</td>

                      <td className="px-4 py-3">
                        {account.privilege_level || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                            account.status
                          )}`}
                        >
                          {account.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">{account.owner || "—"}</td>

                      <td className="px-4 py-3">
                        {account.linked_vault_secret_id ?? "—"}
                      </td>

                      <td className="px-4 py-3">
                        {account.linked_policy_id ?? "—"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${readinessBadgeClass(
                              readiness.ready
                            )}`}
                          >
                            {readiness.ready ? "ГОТОВ" : "НЕ ГОТОВ"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {readiness.reason}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-[260px]">
                        <div className="truncate" title={account.notes || ""}>
                          {account.notes || "—"}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}