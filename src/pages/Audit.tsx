import { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "../components/ui/input";
import ActionMenuAudit from "../components/ActionMenuAudit";
import PolicyPieChart from "../components/charts/PolicyPieChart";
import { apiGet } from "../api/client";
import { useSearchParams, useNavigate } from "react-router-dom";

/* =====================================================
   Backend model (v1.0.0-backend-mvp)
===================================================== */
interface BackendAuditLog {
  id: number;
  created_at: string;
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
  time: string;
  user: string;
  action: string;
  category: string;
  status: "success" | "failed" | "warning";
  ip: string;
  details: any;
}

/* =====================================================
   Mapper
===================================================== */
function mapAuditLog(log: BackendAuditLog): AuditRecord {
  const actionUpper = log.action.toUpperCase();

  let status: AuditRecord["status"] = "success";
  if (actionUpper.includes("FAILED") || actionUpper.includes("DENY")) {
    status = "failed";
  } else if (actionUpper.includes("WARNING")) {
    status = "warning";
  }

  return {
    id: log.id,
    time: log.created_at,
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

  const blob = new Blob(["\uFEFF" + header + rows], {
    type: "text/csv;charset=utf-8;",
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "audit_logs.csv";
  a.click();
}

function exportJson(records: AuditRecord[]) {
  const blob = new Blob([JSON.stringify(records, null, 2)], {
    type: "application/json;charset=utf-8;",
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "audit_logs.json";
  a.click();
}

function exportSingleAuditJson(record: AuditRecord) {
  const blob = new Blob([JSON.stringify(record, null, 2)], {
    type: "application/json;charset=utf-8;",
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `audit_${record.id}.json`;
  a.click();
}

/* =====================================================
   Detail panel (WITH CORRELATION)
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
        </div>

        <div className="mt-4 bg-[#0E1A3A] p-3 rounded border border-white/10">
          <div className="text-xs font-bold mb-1">Details (SIEM-ready)</div>
          <pre className="text-xs whitespace-pre-wrap">
{JSON.stringify(record.details, null, 2)}
          </pre>
        </div>

        {/* === CORRELATION BUTTONS === */}
        <div className="mt-4 space-y-2">
          {record.details?.role_id && (
            <button
              onClick={() =>
                navigate(`/roles?highlight=${record.details.role_id}`)
              }
              className="w-full px-4 py-2 bg-[#1A243F] hover:bg-[#0E1A3A] rounded text-white transition"
            >
              Открыть роль
            </button>
          )}

          {record.details?.session_id && (
            <button
              onClick={() =>
                navigate(`/sessions?session_id=${record.details.session_id}`)
              }
              className="w-full px-4 py-2 bg-[#1A243F] hover:bg-[#0E1A3A] rounded text-white transition"
            >
              Открыть сессию
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded text-white"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   Main component
===================================================== */
export default function Audit() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<AuditRecord | null>(null);

  const [searchParams] = useSearchParams();
  const appliedFromUrl = useRef(false);

  /* ===== LOAD AUDIT ===== */
  useEffect(() => {
    apiGet("/audit/logs")
      .then((data: BackendAuditLog[]) => {
        setRecords(data.map(mapAuditLog));
      })
      .catch(console.error);
  }, []);

  /* ===== URL PATCH (Roles → Audit) ===== */
  useEffect(() => {
    if (appliedFromUrl.current) return;

    const category = searchParams.get("category");
    const roleId = searchParams.get("role_id");

    if (category) setCategoryFilter(category);
    if (roleId) setSearch(roleId);

    if (category || roleId) appliedFromUrl.current = true;
  }, [searchParams]);

  /* ===== FILTERING ===== */
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const text =
        r.user.toLowerCase().includes(search.toLowerCase()) ||
        r.action.toLowerCase().includes(search.toLowerCase()) ||
        r.ip.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "all" || r.status === statusFilter;
      const matchCategory =
        categoryFilter === "all" || r.category === categoryFilter;

      return text && matchStatus && matchCategory;
    });
  }, [records, search, statusFilter, categoryFilter]);

  const successCount = records.filter(
    (r) => r.status === "success"
  ).length;
  const failedCount = records.filter(
    (r) => r.status === "failed"
  ).length;

  return (
    <div className="p-8 w-full bg-white text-gray-900 space-y-6">
      <h1 className="text-3xl font-bold">Аудит</h1>

      <PolicyPieChart active={successCount} disabled={failedCount} />

      {/* FILTERS */}
      <div className="flex items-center gap-3 bg-white border p-4 rounded-xl">
        <Input
          className="w-80"
          placeholder="Поиск по пользователю, действию или IP"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 border rounded bg-white shadow-sm hover:bg-gray-100"
        >
          <option value="all">Все статусы</option>
          <option value="success">Успех</option>
          <option value="failed">Ошибка</option>
          <option value="warning">Предупреждение</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 border rounded bg-white shadow-sm hover:bg-gray-100"
        >
          <option value="all">Все категории</option>
          <option value="role">Роли</option>
          <option value="auth">Auth</option>
          <option value="session">Sessions</option>
          <option value="policy">Policies</option>
          <option value="system">System</option>
        </select>

        <button
          onClick={() => exportCsv(filtered)}
          className="h-10 px-4 border rounded bg-white shadow-sm hover:bg-gray-100"
        >
          CSV
        </button>

        <button
          onClick={() => exportJson(filtered)}
          className="h-10 px-4 border rounded bg-white shadow-sm hover:bg-gray-100"
        >
          JSON
        </button>
      </div>

      {/* TABLE */}
      <div className="rounded-xl border bg-[#121A33] overflow-auto">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F]">
            <tr>
              <th className="p-3">Время</th>
              <th className="p-3">Пользователь</th>
              <th className="p-3">Категория</th>
              <th className="p-3">Действие</th>
              <th className="p-3">IP</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Действия</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((record) => (
              <tr
                key={record.id}
                className="border-t border-[#1E2A45]"
              >
                <td className="p-3">{record.time}</td>
                <td className="p-3">{record.user}</td>
                <td className="p-3">{record.category}</td>
                <td className="p-3">{record.action}</td>
                <td className="p-3">{record.ip}</td>
                <td className="p-3">{record.status}</td>
                <td className="p-3">
                  <ActionMenuAudit
                    onView={() => {
                      setSelectedRecord(record);
                      setDetailOpen(true);
                    }}
                    onExportJson={() =>
                      exportSingleAuditJson(record)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AuditDetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        record={selectedRecord}
      />
    </div>
  );
}
