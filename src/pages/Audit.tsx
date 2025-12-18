import { useState, useEffect, useMemo } from "react";
import { Input } from "../components/ui/input";
import ActionMenuAudit from "../components/ActionMenuAudit";
import PolicyPieChart from "../components/charts/PolicyPieChart";
import { apiGet } from "../api/client";
import { useNavigate } from "react-router-dom";

/* =====================================================
   Backend model
===================================================== */
interface BackendAuditLog {
  id: number;
  created_at: string; // ISO или "DD.MM.YYYY HH:MM:SS"
  user: string;
  action: string;
  category: string;
  details: any;
}

/* =====================================================
   UI model
===================================================== */
interface AuditRecord {
  id: number;
  time: string; // строка для UI
  ts: number;   // timestamp для фильтра дат
  user: string;
  action: string;
  category: string;
  status: "success" | "failed" | "warning";
  ip: string;
  details: any;
}

/* =====================================================
   Status labels (ВАЖНО для TS)
===================================================== */
const STATUS_LABEL: Record<AuditRecord["status"], string> = {
  success: "Успешно",
  failed: "Ошибка",
  warning: "Предупреждение",
};

/* =====================================================
   Date parsing (ISO + DD.MM.YYYY HH:MM:SS)
===================================================== */
function parseCreatedAt(value: string): Date | null {
  if (!value) return null;

  // ISO / стандартный Date
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso;

  // DD.MM.YYYY HH:MM:SS
  const m = value.match(
    /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!m) return null;

  const d = new Date(
    Number(m[3]),
    Number(m[2]) - 1,
    Number(m[1]),
    Number(m[4] ?? 0),
    Number(m[5] ?? 0),
    Number(m[6] ?? 0)
  );

  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTime(d: Date): string {
  return d.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* =====================================================
   Mapper
===================================================== */
function mapAuditLog(log: BackendAuditLog): AuditRecord {
  const actionUpper = (log.action || "").toUpperCase();

  let status: AuditRecord["status"] = "success";
  if (actionUpper.includes("FAILED") || actionUpper.includes("DENY")) {
    status = "failed";
  } else if (actionUpper.includes("WARNING")) {
    status = "warning";
  }

  const parsed = parseCreatedAt(log.created_at);

  return {
    id: log.id,
    time: parsed ? formatDateTime(parsed) : log.created_at,
    ts: parsed ? parsed.getTime() : 0,
    user: log.user,
    action: log.action,
    category: log.category,
    status,
    ip: log.details?.ip ?? "—",
    details: log.details ?? {},
  };
}

/* =====================================================
   Export helpers
===================================================== */
function download(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportCsv(records: AuditRecord[]) {
  const header = "id,time,user,category,action,status,ip,details\n";
  const rows = records
    .map(
      (r) =>
        `${r.id},"${r.time}",${r.user},${r.category},"${r.action}",${r.status},${r.ip},"${JSON.stringify(
          r.details
        ).replace(/"/g, '""')}"`
    )
    .join("\n");

  download(
    new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    }),
    `audit_${new Date().toISOString().slice(0, 19)}.csv`
  );
}

function exportJson(records: AuditRecord[]) {
  download(
    new Blob([JSON.stringify(records, null, 2)], {
      type: "application/json;charset=utf-8;",
    }),
    `audit_${new Date().toISOString().slice(0, 19)}.json`
  );
}

function exportSingleJson(record: AuditRecord) {
  exportJson([record]);
}

function exportSingleCsv(record: AuditRecord) {
  exportCsv([record]);
}

/* =====================================================
   Detail panel
===================================================== */
function AuditDetailPanel({
  open,
  onClose,
  record,
}: {
  open: boolean;
  onClose: () => void;
  record: AuditRecord | null;
}) {
  const navigate = useNavigate();
  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-[9999]">
      <div className="w-[420px] bg-[#121A33] h-full p-6 text-white overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Детали события</h2>

        <div className="space-y-2 text-sm">
          <div><b>Время:</b> {record.time}</div>
          <div><b>Пользователь:</b> {record.user}</div>
          <div><b>Категория:</b> {record.category}</div>
          <div><b>Действие:</b> {record.action}</div>
          <div><b>IP:</b> {record.ip}</div>
          <div><b>Статус:</b> {STATUS_LABEL[record.status]}</div>
        </div>

        <div className="mt-4 bg-[#0E1A3A] p-3 rounded border border-[#1E2A45]">
          <div className="text-xs font-semibold mb-1">Details</div>
          <pre className="text-xs whitespace-pre-wrap text-gray-300">
{JSON.stringify(record.details, null, 2)}
          </pre>
        </div>

        <div className="mt-4 space-y-2">
          {record.details?.role_id && (
            <button
              onClick={() =>
                navigate(`/roles?highlight=${record.details.role_id}`)
              }
              className="w-full px-4 py-2 bg-[#0E1A3A] hover:bg-[#1A243F] rounded"
            >
              Открыть роль
            </button>
          )}

          {record.details?.session_id && (
            <button
              onClick={() =>
                navigate(`/sessions?session_id=${record.details.session_id}`)
              }
              className="w-full px-4 py-2 bg-[#0E1A3A] hover:bg-[#1A243F] rounded"
            >
              Открыть сессию
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   MAIN
===================================================== */
export default function Audit() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [action, setAction] = useState("all");

  // date filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination (как Users.tsx)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<AuditRecord | null>(null);

  /* LOAD */
  useEffect(() => {
    setLoading(true);
    apiGet("/audit/logs")
      .then((data: BackendAuditLog[]) => {
        setRecords(Array.isArray(data) ? data.map(mapAuditLog) : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, action, dateFrom, dateTo, rowsPerPage]);

  /* FILTER */
  const filtered = useMemo(() => {
    const fromTs = dateFrom
      ? new Date(dateFrom + "T00:00:00").getTime()
      : null;
    const toTs = dateTo
      ? new Date(dateTo + "T23:59:59").getTime()
      : null;

    return records.filter((r) => {
      const text =
        r.user.toLowerCase().includes(search.toLowerCase()) ||
        r.action.toLowerCase().includes(search.toLowerCase()) ||
        r.ip.toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        category === "all" || r.category === category;
      const matchAction =
        action === "all" || r.action === action;

      const matchFrom = fromTs === null ? true : r.ts >= fromTs;
      const matchTo = toTs === null ? true : r.ts <= toTs;

      return text && matchCategory && matchAction && matchFrom && matchTo;
    });
  }, [records, search, category, action, dateFrom, dateTo]);

  /* PAGINATION */
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);

  /* STATS */
  const successCount = records.filter((r) => r.status === "success").length;
  const failedCount = records.filter((r) => r.status === "failed").length;

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-6">Аудит</h1>

      <div className="mb-8 h-[260px]">
        <PolicyPieChart active={successCount} disabled={failedCount} />
      </div>


      {/* FILTERS + EXPORT */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <Input
          placeholder="Поиск по пользователю, действию или IP"
          className="w-72 bg-white border text-gray-900 placeholder-gray-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border p-2 rounded bg-white"
        >
          <option value="all">Все категории</option>
          <option value="auth">Auth</option>
          <option value="role">Roles</option>
          <option value="policy">Policies</option>
          <option value="session">Sessions</option>
          <option value="system">System</option>
        </select>

        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border p-2 rounded bg-white"
        >
          <option value="all">Все действия</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="ROLE_CREATE">ROLE_CREATE</option>
          <option value="ROLE_UPDATE">ROLE_UPDATE</option>
          <option value="SESSION_DENY">SESSION_DENY</option>
          <option value="MFA_FAIL">MFA_FAIL</option>
        </select>

        <input
          type="date"
          className="border p-2 rounded bg-white"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded bg-white"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />

        <button
          onClick={() => exportCsv(filtered)}
          className="px-4 py-2 border rounded bg-white"
        >
          CSV
        </button>

        <button
          onClick={() => exportJson(filtered)}
          className="px-4 py-2 border rounded bg-white"
        >
          JSON
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-y-auto max-h-[500px] rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33]">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left">Время</th>
              <th className="p-3 text-left">Пользователь</th>
              <th className="p-3 text-left">Категория</th>
              <th className="p-3 text-left">Действие</th>
              <th className="p-3 text-left">IP</th>
              <th className="p-3 text-left">Статус</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  Загрузка…
                </td>
              </tr>
            ) : currentRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  Нет данных
                </td>
              </tr>
            ) : (
              currentRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] transition"
                >
                  <td className="p-3">{r.time}</td>
                  <td className="p-3">{r.user}</td>
                  <td className="p-3">{r.category}</td>
                  <td className="p-3">{r.action}</td>
                  <td className="p-3">{r.ip}</td>
                  <td className="p-3">
                    <span
                      className={
                        r.status === "success"
                          ? "text-green-400"
                          : r.status === "failed"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="p-3">
                    <ActionMenuAudit
                      onView={() => {
                        setSelected(r);
                        setDetailOpen(true);
                      }}
                      onExportJson={() => exportSingleJson(r)}
                      onExportCsv={() => exportSingleCsv(r)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION (как Users.tsx) */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <span>Показать:</span>
          <select
            className="border p-1 rounded bg-white"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <button
            className="px-2 text-black"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            {"<<"}
          </button>
          <button
            className="px-2 text-black"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            {"<"}
          </button>
          <span className="font-medium">
            {currentPage} / {totalPages || 1}
          </span>
          <button
            className="px-2 text-black"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            {">"}
          </button>
          <button
            className="px-2 text-black"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            {">>"}
          </button>
        </div>
      </div>

      <AuditDetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        record={selected}
      />
    </div>
  );
}
