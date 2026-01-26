// src/pages/VaultRequests.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const [requests, setRequests] = useState<VaultRequest[]>([]);
  const [status, setStatus] = useState<VaultRequestStatus | "ALL">("PENDING");
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(false);

  // search (client-side, safe)
  const [search, setSearch] = useState("");

  // pagination (client-side, безопасно: backend не трогаем)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const goToVault = (secretId: unknown, openHistory?: boolean) => {
  const sid = Number(secretId);
  if (!Number.isFinite(sid)) return;

  const qs = openHistory ? `?secret_id=${sid}&history=1` : `?secret_id=${sid}`;
  navigate(`/vault${qs}`);
};

  async function load() {
    setLoading(true);
    try {
      const data = await listVaultRequests({
        status: status === "ALL" ? undefined : status,
        mine,
      });
      setRequests(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message || "Ошибка загрузки запросов Vault");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // фильтры поменялись — начинаем с первой страницы
    setCurrentPage(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mine]);

  async function onApprove(id: number) {
    try {
      await approveVaultRequest(id, { grant_ttl_minutes: 60 });
      toast.success("Запрос одобрен");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка одобрения");
    }
  }

  async function onDeny(id: number) {
    try {
      await denyVaultRequest(id);
      toast.success("Запрос отклонён");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка отклонения");
    }
  }

  async function onCancel(id: number) {
    try {
      await cancelVaultRequest(id);
      toast.success("Запрос отменён");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка отмены");
    }
  }

  // ===== search + derived list =====
  const filteredRequests = useMemo(() => {
    const safe = Array.isArray(requests) ? requests : [];
    const q = search.trim().toLowerCase();
    if (!q) return safe;

    return safe.filter((r) => {
      const requester = (r.requester ?? "").toLowerCase();
      const secretId = String(r.secret_id ?? "");
      const reqId = String(r.id ?? "");
      return requester.includes(q) || secretId.includes(q) || reqId.includes(q);
    });
  }, [requests, search]);

  // ===== pagination derived =====
  const totalPages = useMemo(() => {
    const total = Math.ceil((filteredRequests?.length ?? 0) / rowsPerPage);
    return Math.max(1, total || 1);
  }, [filteredRequests, rowsPerPage]);

  const currentRows = useMemo(() => {
    const safe = Array.isArray(filteredRequests) ? filteredRequests : [];
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return safe.slice(start, end);
  }, [filteredRequests, currentPage, rowsPerPage]);

  // safety: если удалили/отфильтровали и страниц стало меньше
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="p-6 w-full bg-gray-100 text-black min-h-screen space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Vault · Запросы доступа</h1>
          <p className="text-sm text-gray-600 mt-1">
            Управление запросами на временный доступ к секретам
          </p>
        </div>
      </div>

      {/* FILTERS (светлый блок, как общий стиль) */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Статус:</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="border rounded-md px-3 py-2 text-sm bg-white text-black"
          >
            <option value="ALL">Все статусы</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-800 select-none">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => setMine(e.target.checked)}
          />
          Только мои
        </label>

        {/* Search (client-side) */}
        <input
          placeholder="Поиск: requester / secret_id / id…"
          className="w-72 bg-white text-black border p-2 rounded"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        <div className="ml-auto text-sm text-gray-600">
          Показано:{" "}
          <span className="font-semibold text-gray-900">
            {filteredRequests.length}
          </span>{" "}
          из{" "}
          <span className="font-semibold text-gray-900">{requests.length}</span>
        </div>
      </div>

      {/* TABLE (тёмная карточка/таблица в стиле KazPAM) */}
      <div className="overflow-hidden rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33]">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Secret</th>
              <th className="px-4 py-3 text-left">Requester</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Создан</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-300">
                  Загрузка…
                </td>
              </tr>
            )}

            {!loading && currentRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-300">
                  Нет запросов
                </td>
              </tr>
            )}

            {!loading &&
              currentRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] transition"
                >
                  <td className="px-4 py-3">{r.id}</td>

                  {/* Secret + quick open */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>#{r.secret_id}</span>
                      <button
                        type="button"
                        onClick={() => goToVault(r.secret_id)}
                        className="px-2 py-1 rounded border border-[#1E2A45] bg-[#0E1A3A] hover:border-[#0052FF] text-xs text-gray-200"
                        title="Открыть секрет в Vault"
                      >
                        Открыть
                      </button>
                       <button
                         type="button"
                         onClick={() => goToVault(r.secret_id, true)}
                         className="px-2 py-1 rounded border border-[#1E2A45] bg-[#0E1A3A] hover:border-[#0052FF] text-xs text-gray-200"
                         title="Открыть Vault и сразу показать историю"
                         >
                         История
                        </button>
                        </div>
                        </td>

                  <td className="px-4 py-3">{r.requester}</td>
                  <td className="px-4 py-3">
                    <StatusChip status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-200">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </td>

                  <td className="px-4 py-3 text-right space-x-2">
                    {r.status === "PENDING" && (
                      <>
                        <Access permission="approve_vault_requests">
                          <button
                            onClick={() => onApprove(r.id)}
                            className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => onDeny(r.id)}
                            className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs"
                          >
                            Deny
                          </button>
                        </Access>

                        <Access permission="request_vault_access">
                          <button
                            onClick={() => onCancel(r.id)}
                            className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-xs"
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

      {/* Pagination (светлая, ВНЕ таблицы — как Users.tsx стиль) */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2 text-sm text-gray-800">
          <span>Показать:</span>
          <select
            className="border p-1 rounded bg-white text-black"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>

          <span className="text-gray-600 ml-2">
            Строк:{" "}
            <span className="font-semibold text-gray-900">
              {currentRows.length}
            </span>{" "}
            из{" "}
            <span className="font-semibold text-gray-900">
              {filteredRequests.length}
            </span>
          </span>
        </div>

        <div className="flex gap-2 items-center text-sm">
          <button
            className="px-2 text-black disabled:text-gray-400"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            {"<<"}
          </button>

          <button
            className="px-2 text-black disabled:text-gray-400"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            {"<"}
          </button>

          <span className="font-medium text-gray-900">
            {currentPage} / {totalPages}
          </span>

          <button
            className="px-2 text-black disabled:text-gray-400"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            {">"}
          </button>

          <button
            className="px-2 text-black disabled:text-gray-400"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            {">>"}
          </button>
        </div>
      </div>
    </div>
  );
}