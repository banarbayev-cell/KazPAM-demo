import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  fetchIncidents,
  updateIncidentStatus,
  type IncidentItem,
} from "../api/incidents";
import { formatKzDateTime } from "../utils/time";
import {
  getIncidentSeverityBadgeClass,
  getIncidentStatusBadgeClass,
  getNextIncidentStatus,
  getNextIncidentStatusLabel,
} from "../utils/incidentUi";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Incidents() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [severity, setSeverity] = useState(searchParams.get("severity") || "all");
  const [q, setQ] = useState(searchParams.get("q") || "");

  const initialPage = Number(searchParams.get("page") || "1");
  const initialPageSize = Number(searchParams.get("page_size") || "25");

  const [page, setPage] = useState(
    Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1
  );
  const [pageSize, setPageSize] = useState(
    PAGE_SIZE_OPTIONS.includes(initialPageSize) ? initialPageSize : 25
  );

  useEffect(() => {
    const nextStatus = searchParams.get("status") || "all";
    const nextSeverity = searchParams.get("severity") || "all";
    const nextQ = searchParams.get("q") || "";

    const nextPageRaw = Number(searchParams.get("page") || "1");
    const nextPage =
      Number.isFinite(nextPageRaw) && nextPageRaw > 0 ? nextPageRaw : 1;

    const nextPageSizeRaw = Number(searchParams.get("page_size") || "25");
    const nextPageSize = PAGE_SIZE_OPTIONS.includes(nextPageSizeRaw)
      ? nextPageSizeRaw
      : 25;

    if (nextStatus !== status) {
      setStatus(nextStatus);
    }

    if (nextSeverity !== severity) {
      setSeverity(nextSeverity);
    }

    if (nextQ !== q) {
      setQ(nextQ);
    }

    if (nextPage !== page) {
      setPage(nextPage);
    }

    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const setQueryState = (next: {
    q?: string;
    status?: string;
    severity?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const nextQ = next.q ?? q;
    const nextStatus = next.status ?? status;
    const nextSeverity = next.severity ?? severity;
    const nextPage = next.page ?? page;
    const nextPageSize = next.pageSize ?? pageSize;

    setQ(nextQ);
    setStatus(nextStatus);
    setSeverity(nextSeverity);
    setPage(nextPage);
    setPageSize(nextPageSize);

    const params = new URLSearchParams();

    if (nextQ.trim()) {
      params.set("q", nextQ.trim());
    }

    if (nextStatus !== "all") {
      params.set("status", nextStatus);
    }

    if (nextSeverity !== "all") {
      params.set("severity", nextSeverity);
    }

    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }

    if (nextPageSize !== 25) {
      params.set("page_size", String(nextPageSize));
    }

    setSearchParams(params, { replace: true });
  };

  const updateFilters = (next: {
    q?: string;
    status?: string;
    severity?: string;
  }) => {
    setQueryState({
      q: next.q ?? q,
      status: next.status ?? status,
      severity: next.severity ?? severity,
      page: 1,
      pageSize,
    });
  };

  const changePage = (nextPage: number) => {
    setQueryState({
      page: nextPage,
    });
  };

  const changePageSize = (nextPageSize: number) => {
    setQueryState({
      page: 1,
      pageSize: nextPageSize,
    });
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchIncidents({
        status,
        severity,
        q,
      });

      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить incidents");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 250);

    return () => clearTimeout(timer);
  }, [status, severity, q]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      changePage(totalPages);
    }
  }, [page, totalPages]); // eslint-disable-line react-hooks/exhaustive-deps

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const pageFrom = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageTo = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems);

  const handleChangeStatus = async (item: IncidentItem) => {
    const targetStatus = getNextIncidentStatus(item.status);

    try {
      setBusyId(item.id);
      await updateIncidentStatus(item.id, targetStatus);
      toast.success(`Incident #${item.id}: статус обновлён на ${targetStatus}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Не удалось обновить статус инцидента");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 space-y-6 text-[#0A0F24]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SOC · Incidents</h1>
          <p className="text-sm text-gray-600 mt-1">
            Просмотр, фильтрация и управление жизненным циклом инцидентов
          </p>
        </div>

        <Link
          to="/soc"
          className="px-4 py-2 rounded-lg border border-[#D7DEED] bg-white text-sm hover:bg-gray-50"
        >
          Назад в SOC
        </Link>
      </div>

      <div className="bg-[#121A33] border border-[#1E2A45] rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={q}
          onChange={(e) => updateFilters({ q: e.target.value })}
          placeholder="Поиск: user / system / ip / summary / correlation_id"
          className="md:col-span-2 rounded-lg bg-[#0E1A3A] border border-[#24314F] px-3 py-2 text-white outline-none"
        />

        <select
          value={status}
          onChange={(e) => updateFilters({ status: e.target.value })}
          className="rounded-lg bg-[#0E1A3A] border border-[#24314F] px-3 py-2 text-white outline-none"
        >
          <option value="all">Все статусы</option>
          <option value="OPEN">OPEN</option>
          <option value="INVESTIGATING">INVESTIGATING</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="ESCALATED">ESCALATED</option>
        </select>

        <select
          value={severity}
          onChange={(e) => updateFilters({ severity: e.target.value })}
          className="rounded-lg bg-[#0E1A3A] border border-[#24314F] px-3 py-2 text-white outline-none"
        >
          <option value="all">Все severity</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
      </div>

      <div className="bg-[#121A33] border border-[#1E2A45] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1E2A45] text-sm text-gray-300 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            {loading
              ? "Загрузка incidents..."
              : `Всего: ${totalItems} · Показано: ${pageFrom}-${pageTo} · Страница ${page} из ${totalPages}`}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">На странице:</span>
            <select
              value={pageSize}
              onChange={(e) => changePageSize(Number(e.target.value))}
              className="rounded-lg bg-[#0E1A3A] border border-[#24314F] px-3 py-2 text-sm text-white outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="px-4 py-4 text-sm text-red-300 border-b border-[#1E2A45]">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0E1A3A] text-gray-300">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Время</th>
                <th className="text-left px-4 py-3">Пользователь</th>
                <th className="text-left px-4 py-3">Система</th>
                <th className="text-left px-4 py-3">IP</th>
                <th className="text-left px-4 py-3">Severity</th>
                <th className="text-left px-4 py-3">Risk</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Summary</th>
                <th className="text-left px-4 py-3">Действия</th>
              </tr>
            </thead>

            <tbody className="text-white">
              {pagedItems.length === 0 && !loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Инциденты не найдены
                  </td>
                </tr>
              ) : (
                pagedItems.map((item) => (
                  <tr key={item.id} className="border-t border-[#1E2A45] align-top">
                    <td className="px-4 py-3 font-semibold">#{item.id}</td>

                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {formatKzDateTime(item.created_at, {
                        seconds: false,
                        naiveInput: "utc",
                      })}
                    </td>

                    <td className="px-4 py-3">{item.user || "—"}</td>
                    <td className="px-4 py-3">{item.system || "—"}</td>
                    <td className="px-4 py-3">{item.ip || "—"}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${getIncidentSeverityBadgeClass(
                          item.severity
                        )}`}
                      >
                        {item.severity}
                      </span>
                    </td>

                    <td className="px-4 py-3">{item.risk_score}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${getIncidentStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-gray-300 max-w-[320px]">
                      {item.summary || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2 min-w-[180px]">
                        <Link
                          to={`/soc/incidents/${item.id}`}
                          className="px-3 py-2 rounded-lg bg-[#0E1A3A] border border-[#24314F] text-center hover:bg-[#12224A]"
                        >
                          Открыть
                        </Link>

                        <button
                          onClick={() => handleChangeStatus(item)}
                          disabled={busyId === item.id}
                          className="px-3 py-2 rounded-lg bg-[#1E2A45] border border-[#2D3A5A] hover:bg-[#25365D] disabled:opacity-50"
                        >
                          {busyId === item.id
                            ? "Обновление..."
                            : getNextIncidentStatusLabel(item.status)}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#1E2A45] px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-300">
            Показано: {pageFrom}-{pageTo} из {totalItems}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => changePage(1)}
              disabled={page <= 1}
              className="px-3 py-2 rounded-lg bg-[#0E1A3A] border border-[#24314F] text-sm text-white disabled:opacity-50"
            >
              «
            </button>

            <button
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-2 rounded-lg bg-[#0E1A3A] border border-[#24314F] text-sm text-white disabled:opacity-50"
            >
              Назад
            </button>

            <div className="px-3 py-2 rounded-lg bg-[#0E1A3A] border border-[#24314F] text-sm text-white min-w-[90px] text-center">
              {page} / {totalPages}
            </div>

            <button
              onClick={() => changePage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-2 rounded-lg bg-[#0E1A3A] border border-[#24314F] text-sm text-white disabled:opacity-50"
            >
              Вперёд
            </button>

            <button
              onClick={() => changePage(totalPages)}
              disabled={page >= totalPages}
              className="px-3 py-2 rounded-lg bg-[#0E1A3A] border border-[#24314F] text-sm text-white disabled:opacity-50"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}