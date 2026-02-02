import { useState, useEffect, useMemo } from "react";
import { Input } from "../components/ui/input";
import ActionMenuAudit from "../components/ActionMenuAudit";
import PolicyPieChart from "../components/charts/PolicyPieChart";
import { apiGet } from "../api/client";
import { useNavigate } from "react-router-dom";

/* =====================================================
   Backend model (backward compatible)
===================================================== */
interface BackendAuditLog {
  id: number;

  // В старых версиях фронта было created_at,
  // в текущем backend AuditLog есть timestamp.
  // Держим оба, чтобы ничего не ломать.
  created_at?: string;
  timestamp?: string;

  user: string;
  action: string;
  category: string;

  // backend может вернуть:
  // - string (json.dumps или str(dict))
  // - object
  // - null
  details: any;
}

/* =====================================================
   UI model
===================================================== */
interface AuditRecord {
  id: number;
  time: string; // строка для UI
  ts: number; // timestamp для фильтра дат
  user: string;
  action: string;
  category: string; // нормализованная категория для фильтров
  status: "success" | "failed" | "warning";
  ip: string;
  details: any; // нормализованный details (object)
}

/* =====================================================
   Status labels
===================================================== */
const STATUS_LABEL: Record<AuditRecord["status"], string> = {
  success: "Успешно",
  failed: "Ошибка",
  warning: "Предупреждение",
};
/* =====================================================
   Date parsing (STRICT)
   - DD.MM.YYYY HH:MM(:SS)
   - ISO 8601 only
===================================================== */
function parseCreatedAt(value?: string): Date | null {
  if (!value) return null;

  const v = value.trim();

  // 1️⃣ СТРОГО: DD.MM.YYYY HH:MM(:SS)
  const m = v.match(
    /^(\d{2})\.(\d{2})\.(\d{4})(?:[,\s]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (m) {
    const d = new Date(
      Number(m[3]),        // YYYY
      Number(m[2]) - 1,    // MM (0-based)
      Number(m[1]),        // DD
      Number(m[4] ?? 0),   // HH
      Number(m[5] ?? 0),   // MM
      Number(m[6] ?? 0)    // SS
    );

    return Number.isNaN(d.getTime()) ? null : d;
  }

  // 2️⃣ ТОЛЬКО ISO 8601
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const iso = new Date(v);
    return Number.isNaN(iso.getTime()) ? null : iso;
  }

  // 3️⃣ Всё остальное — недоверенное
  return null;
}

/* =====================================================
   Date formatting (UI-safe)
===================================================== */
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
   Details normalization (safe)
===================================================== */
function normalizeDetails(details: unknown): Record<string, any> {
  if (!details) return {};

  // object (already parsed)
  if (typeof details === "object") return details as Record<string, any>;

  // string → try JSON.parse
  if (typeof details === "string") {
    const s = details.trim();

    if (!s || s === "null" || s === "undefined") return {};

    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object") return parsed as Record<string, any>;
      return { raw: parsed };
    } catch {
      // python str(dict) или произвольная строка
      return { raw: s };
    }
  }

  // number/boolean/etc
  return { raw: details };
}

/* =====================================================
   Category normalization (for UI filters)
   - backend: "AUTH", "role", "soc", "policy", ...
   - UI selects: auth/role/policy/session/system/soc
===================================================== */
function normalizeCategory(category: unknown): string {
  const c = String(category ?? "").trim();
  if (!c) return "system";

  // унифицируем
  const lower = c.toLowerCase();

  // поддержим варианты
  if (lower === "auth") return "auth";
  if (lower === "role" || lower === "roles") return "role";
  if (lower === "policy" || lower === "policies") return "policy";
  if (lower === "session" || lower === "sessions") return "session";
  if (lower === "soc") return "soc";
  if (lower === "system") return "system";

  // если пришло что-то новое — не ломаем, но кладём как есть (lower)
  return lower;
}

/* =====================================================
   Status inference (safe)
===================================================== */
function inferStatus(action: string): AuditRecord["status"] {
  const a = (action || "").toUpperCase();

  // failed patterns
  if (
    a.includes("FAIL") ||
    a.includes("FAILED") ||
    a.includes("DENY") ||
    a.includes("DENIED") ||
    a.includes("ERROR")
  ) {
    return "failed";
  }

  // warning patterns
  if (a.includes("WARN") || a.includes("WARNING")) {
    return "warning";
  }

  return "success";
}

/* =====================================================
   Timestamp extraction (created_at OR timestamp)
===================================================== */
function extractTimeField(log: BackendAuditLog): string {
  // приоритет: timestamp (backend AuditLog), затем created_at (старые версии)
  return (log.timestamp || log.created_at || "").toString();
}

/* =====================================================
   Mapper
===================================================== */
function mapAuditLog(log: BackendAuditLog): AuditRecord {
  const rawTime = extractTimeField(log);
  const parsed = parseCreatedAt(rawTime);

  const details = normalizeDetails(log.details);
  const ipRaw =
  details.ip ??
  details.source_ip ??
  details.client_ip ??
  details.remote_ip ??
  null;

const ip =
  ipRaw
    ? String(ipRaw)
    : "—";



  const category = normalizeCategory(log.category);
  const status = inferStatus(log.action);

  return {
    id: log.id,
    time: parsed ? formatDateTime(parsed) : rawTime || "—",
    ts: parsed ? parsed.getTime() : 0,
    user: log.user,
    action: log.action,
    category,
    status,
    ip,
    details,
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
  const header = [
    "id",
    "time",
    "user",
    "category",
    "action",
    "status",
    "ip",
    "details",
  ].join(";") + "\n";

  const rows = records
    .map((r) => {
      const detailsStr = JSON.stringify(r.details ?? {})
        .replace(/"/g, '""'); // CSV escape

      return [
        r.id,
        r.time,
        r.user,
        r.category,
        r.action,
        r.status,
        r.ip,
        detailsStr,
      ]
        .map((v) => `"${String(v ?? "")}"`)
        .join(";");
    })
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
          <div>
            <b>Время:</b> {record.time}
          </div>
          <div>
            <b>Пользователь:</b> {record.user}
          </div>
          <div>
            <b>Категория:</b> {record.category}
          </div>
          <div>
            <b>Действие:</b> {record.action}
          </div>
          <div>
            <b>IP:</b> {record.ip}
          </div>
          <div>
            <b>Статус:</b> {STATUS_LABEL[record.status]}
          </div>
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
      onClick={() => navigate(`/roles?highlight=${record.details.role_id}`)}
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

  {record.details?.recording_id && (
    <button
      onClick={() =>
        navigate(`/recordings/${record.details.recording_id}`)
      }
      className="w-full px-4 py-2 bg-[#0E1A3A] hover:bg-[#1A243F] rounded"
    >
      Воспроизвести запись сессии
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
    const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    const q = search.toLowerCase();

    return records.filter((r) => {
      const text =
        r.user.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.ip.toLowerCase().includes(q);

      const matchCategory = category === "all" || r.category === category;
      const matchAction = action === "all" || r.action === action;

      const matchFrom =
  fromTs === null ? true : (r.ts === 0 ? true : r.ts >= fromTs);

const matchTo =
  toTs === null ? true : (r.ts === 0 ? true : r.ts <= toTs);


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

      <div className="mb-8">
  <PolicyPieChart
    active={successCount}
    disabled={failedCount}
    title="Статистика"
  />
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
          <option value="soc">SOC</option>
          <option value="system">System</option>
        </select>

        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border p-2 rounded bg-white"
        >
          <option value="all">Все действия</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="LOGIN_FAIL">LOGIN_FAIL</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="role.create">role.create</option>
          <option value="role.update">role.update</option>
          <option value="role.assign">role.assign</option>
          <option value="role.unassign">role.unassign</option>
          <option value="session.denied">session.denied</option>
          <option value="session.failed">session.failed</option>
          <option value="SOC_ISOLATE_SESSION">SOC_ISOLATE_SESSION</option>
          <option value="SOC_BLOCK_USER">SOC_BLOCK_USER</option>
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
