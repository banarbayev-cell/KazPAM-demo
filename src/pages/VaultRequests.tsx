// src/pages/VaultRequests.tsx
import { useEffect, useState } from "react";
import {
  listVaultRequests,
  approveVaultRequest,
  denyVaultRequest,
  cancelVaultRequest,
  VaultRequest,
  VaultRequestStatus,
} from "@/api/vaultRequests";
import Access from "@/components/Access";
import StatusChip from "@/components/StatusChip";
import { toast } from "sonner";

const STATUS_OPTIONS: VaultRequestStatus[] = [
  "PENDING",
  "APPROVED",
  "DENIED",
  "CANCELLED",
];

export default function VaultRequests() {
  const [requests, setRequests] = useState<VaultRequest[]>([]);
  const [status, setStatus] = useState<VaultRequestStatus | "ALL">("PENDING");
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listVaultRequests({
        status: status === "ALL" ? undefined : status,
        mine,
      });
      setRequests(data);
    } catch (e: any) {
      toast.error(e?.message || "Ошибка загрузки запросов Vault");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status, mine]);

  async function onApprove(id: number) {
    try {
      await approveVaultRequest(id, { grant_ttl_minutes: 60 });
      toast.success("Запрос одобрен");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка одобрения");
    }
  }

  async function onDeny(id: number) {
    try {
      await denyVaultRequest(id);
      toast.success("Запрос отклонён");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка отклонения");
    }
  }

  async function onCancel(id: number) {
    try {
      await cancelVaultRequest(id);
      toast.success("Запрос отменён");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка отмены");
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Vault · Запросы доступа</h1>
        <p className="text-sm text-gray-500">
          Управление запросами на временный доступ к секретам
        </p>
      </div>

      {/* FILTERS */}
      <div className="flex items-center gap-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="ALL">Все статусы</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => setMine(e.target.checked)}
          />
          Только мои
        </label>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Secret</th>
              <th className="px-4 py-2 text-left">Requester</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Создан</th>
              <th className="px-4 py-2 text-right">Действия</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center">
                  Загрузка…
                </td>
              </tr>
            )}

            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  Нет запросов
                </td>
              </tr>
            )}

            {requests.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2">#{r.secret_id}</td>
                <td className="px-4 py-2">{r.requester}</td>
                <td className="px-4 py-2">
                  <StatusChip status={r.status} />
                </td>
                <td className="px-4 py-2">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString()
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  {r.status === "PENDING" && (
                    <>
                      <Access permission="approve_vault_requests">
                        <button
                          onClick={() => onApprove(r.id)}
                          className="px-3 py-1 rounded bg-green-600 text-white text-xs"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => onDeny(r.id)}
                          className="px-3 py-1 rounded bg-red-600 text-white text-xs"
                        >
                          Deny
                        </button>
                      </Access>

                      <Access permission="request_vault_access">
                        <button
                          onClick={() => onCancel(r.id)}
                          className="px-3 py-1 rounded bg-gray-400 text-white text-xs"
                        >
                          Cancel
                        </button>
                      </Access>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
