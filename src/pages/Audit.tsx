import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "../components/ui/input";
import ActionMenuAudit from "../components/ActionMenuAudit";
import PolicyPieChart from "../components/charts/PolicyPieChart";
import { apiGet } from "../api/client";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react"; // Если иконки нет, можно убрать или заменить на текст

interface BackendAuditLog {
  id: number;
  created_at?: string;
  timestamp?: string;
  user: string;
  action: string;
  category: string;
  details: any;
}

interface AuditRecord {
  id: number;
  time: string;
  ts: number;
  user: string;
  action: string;
  category: string;
  status: "success" | "failed" | "warning";
  ip: string;
  details: any;
}

const STATUS_LABEL: Record<AuditRecord["status"], string> = {
  success: "Успешно",
  failed: "Ошибка",
  warning: "Предупреждение",
};

// ... Helper functions (parseCreatedAt, normalizeDetails, etc.) keep exactly as you had them ...
function parseCreatedAt(value?: string): Date | null {
  if (!value) return null;
  const v = value.trim();
  const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[,\s]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const iso = new Date(v);
    return Number.isNaN(iso.getTime()) ? null : iso;
  }
  return null;
}

function formatDateTime(d: Date): string {
  return d.toLocaleString("ru-RU", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function normalizeDetails(details: unknown): Record<string, any> {
  if (!details) return {};
  if (typeof details === "object") return details as Record<string, any>;
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      if (parsed && typeof parsed === "object") return parsed as Record<string, any>;
      return { raw: parsed };
    } catch { return { raw: details }; }
  }
  return { raw: details };
}

function normalizeCategory(category: unknown): string {
  const c = String(category ?? "").trim().toLowerCase();
  if (!c) return "system";
  if (c === "auth") return "auth";
  if (c.includes("role")) return "role";
  if (c.includes("polic")) return "policy";
  if (c.includes("sess")) return "session";
  if (c === "soc") return "soc";
  if (c.includes("user")) return "users"; // Added Users category normalization
  return c;
}

function inferStatus(action: string): AuditRecord["status"] {
  const a = (action || "").toUpperCase();
  if (a.includes("FAIL") || a.includes("DENY") || a.includes("ERROR") || a.includes("BLOCK")) return "failed";
  if (a.includes("WARN")) return "warning";
  return "success";
}

function mapAuditLog(log: BackendAuditLog): AuditRecord {
  const rawTime = (log.timestamp || log.created_at || "").toString();
  const parsed = parseCreatedAt(rawTime);
  const details = normalizeDetails(log.details);
  const ip = details.ip ?? details.source_ip ?? "—";
  return {
    id: log.id,
    time: parsed ? formatDateTime(parsed) : rawTime || "—",
    ts: parsed ? parsed.getTime() : 0,
    user: log.user,
    action: log.action,
    category: normalizeCategory(log.category),
    status: inferStatus(log.action),
    ip: String(ip),
    details,
  };
}

function download(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportCsv(records: AuditRecord[]) {
  const header = ["id","time","user","category","action","status","ip","details"].join(";") + "\n";
  const rows = records.map(r => [r.id,r.time,r.user,r.category,r.action,r.status,r.ip,JSON.stringify(r.details ?? {}).replace(/"/g,'""')].map(v=>`"${String(v ?? "")}"`).join(";")).join("\n");
  download(new Blob(["\uFEFF" + header + rows],{type:"text/csv;charset=utf-8;"}),`audit.csv`);
}
function exportJson(records: AuditRecord[]) { download(new Blob([JSON.stringify(records,null,2)],{type:"application/json;charset=utf-8;"}),`audit.json`); }

function AuditDetailPanel({open,onClose,record}:{open:boolean;onClose:()=>void;record:AuditRecord|null;}){
  const navigate = useNavigate();
  if(!open||!record)return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-[9999]">
      <div className="w-[420px] bg-[#121A33] h-full p-6 text-white overflow-y-auto shadow-2xl border-l border-gray-700">
        <h2 className="text-xl font-bold mb-4">Детали события #{record.id}</h2>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2"><b className="text-gray-400">Время:</b> <span className="col-span-2">{record.time}</span></div>
          <div className="grid grid-cols-3 gap-2"><b className="text-gray-400">User:</b> <span className="col-span-2">{record.user}</span></div>
          <div className="grid grid-cols-3 gap-2"><b className="text-gray-400">Category:</b> <span className="col-span-2 uppercase text-xs font-bold tracking-wider bg-gray-800 px-2 py-1 rounded w-max">{record.category}</span></div>
          <div className="grid grid-cols-3 gap-2"><b className="text-gray-400">Action:</b> <span className="col-span-2 text-yellow-400 font-mono">{record.action}</span></div>
          <div className="grid grid-cols-3 gap-2"><b className="text-gray-400">IP:</b> <span className="col-span-2">{record.ip}</span></div>
          <div className="grid grid-cols-3 gap-2"><b className="text-gray-400">Статус:</b> <span className={`col-span-2 font-bold ${record.status==="success"?"text-green-400":record.status==="failed"?"text-red-400":"text-orange-400"}`}>{STATUS_LABEL[record.status]}</span></div>
        </div>
        
        <div className="mt-6">
          <div className="text-xs font-semibold mb-2 text-gray-400 uppercase">Technical Details</div>
          <div className="bg-[#0E1A3A] p-3 rounded border border-[#1E2A45] overflow-x-auto">
            <pre className="text-xs text-green-300 font-mono">{JSON.stringify(record.details,null,2)}</pre>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
           {record.details?.target_user_id && <button onClick={()=>navigate(`/users/${record.details.target_user_id}`)} className="btn-secondary">Открыть пользователя</button>}
           {record.details?.role_id && <button onClick={()=>navigate(`/roles`)} className="btn-secondary">Перейти к ролям</button>}
        </div>

        <button onClick={onClose} className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition">Закрыть панель</button>
      </div>
    </div>
  );
}

export default function Audit(){
  const [records,setRecords]=useState<AuditRecord[]>([]);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("all");
  // Set default to 50 rows as requested
  const [rowsPerPage,setRowsPerPage]=useState(50);
  const [currentPage,setCurrentPage]=useState(1);
  const [detailOpen,setDetailOpen]=useState(false);
  const [selected,setSelected]=useState<AuditRecord|null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    apiGet("/audit/logs")
      .then((data:BackendAuditLog[]) => {
        setRecords(Array.isArray(data) ? data.map(mapAuditLog) : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(()=>{ fetchData(); }, [fetchData]);

  // Reset page when filters change
  useEffect(()=>{setCurrentPage(1);},[search,category,rowsPerPage]);

  const filtered=useMemo(()=>{
    const q=search.toLowerCase();
    return records.filter(r=>{
      const text=r.user.toLowerCase().includes(q)||r.action.toLowerCase().includes(q)||r.ip.toLowerCase().includes(q);
      const matchCategory=category==="all"||r.category===category;
      return text && matchCategory;
    });
  },[records,search,category]);

  const totalPages=Math.ceil(filtered.length/rowsPerPage);
  const currentRows=filtered.slice((currentPage-1)*rowsPerPage,currentPage*rowsPerPage);
  
  const successCount=filtered.filter(r=>r.status==="success").length;
  const failedCount=filtered.filter(r=>r.status==="failed").length;

  return (
    <div className="p-6 w-full bg-gray-100 min-h-screen text-gray-900 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#121A33]">Журнал Аудита</h1>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow transition">
           Обновить
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         <div className="col-span-1 bg-white p-4 rounded-xl shadow-sm border h-40 flex flex-col justify-center items-center">
            <span className="text-gray-500 text-sm">Всего событий</span>
            <span className="text-4xl font-bold text-[#121A33]">{filtered.length}</span>
         </div>
         <div className="col-span-3">
             <div className="bg-white p-4 rounded-xl shadow-sm border h-40 flex items-center justify-around">
                <PolicyPieChart active={successCount} disabled={failedCount} title="Успех / Ошибки"/>
                <div className="space-y-2">
                   <div className="text-green-600 font-bold">Успешно: {successCount}</div>
                   <div className="text-red-500 font-bold">Ошибки: {failedCount}</div>
                </div>
             </div>
         </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-4 bg-white p-3 rounded-lg border shadow-sm">
        <Input placeholder="Поиск (User, Action, IP)..." className="w-72" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select value={category} onChange={e=>setCategory(e.target.value)} className="border p-2 rounded bg-gray-50 text-sm h-10">
          <option value="all">Все категории</option>
          <option value="auth">Auth</option>
          <option value="users">Users</option>
          <option value="role">Roles</option>
          <option value="policy">Policies</option>
          <option value="session">Sessions</option>
          <option value="soc">SOC</option>
          <option value="system">System</option>
        </select>
        <div className="flex-grow"></div>
        <button onClick={()=>exportCsv(filtered)} className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded text-sm font-medium">Скачать CSV</button>
      </div>

      <div className="flex-grow overflow-hidden rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33] flex flex-col">
        <div className="overflow-auto flex-grow">
          <table className="w-full text-sm text-white">
            <thead className="bg-[#1A243F] text-gray-300 sticky top-0 z-10 shadow-md">
              <tr>
                <th className="p-3 text-left w-40">Время</th>
                <th className="p-3 text-left">Пользователь</th>
                <th className="p-3 text-left w-24">Категория</th>
                <th className="p-3 text-left">Действие</th>
                <th className="p-3 text-left w-32">IP</th>
                <th className="p-3 text-left w-24">Статус</th>
                <th className="p-3 text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2A45]">
              {loading ? (
                 <tr><td colSpan={7} className="p-10 text-center text-gray-400 animate-pulse">Загрузка данных...</td></tr>
              ) : currentRows.length === 0 ? (
                 <tr><td colSpan={7} className="p-10 text-center text-gray-400">Событий не найдено</td></tr>
              ) : (
                currentRows.map(r => (
                  <tr key={r.id} className="hover:bg-[#1E2A45] transition-colors group">
                    <td className="p-3 font-mono text-xs text-gray-400">{r.time}</td>
                    <td className="p-3 font-medium">{r.user}</td>
                    <td className="p-3"><span className="bg-[#2A3455] px-2 py-0.5 rounded text-xs uppercase tracking-wide text-gray-300">{r.category}</span></td>
                    <td className="p-3 text-gray-200">{r.action}</td>
                    <td className="p-3 font-mono text-xs text-gray-400">{r.ip}</td>
                    <td className="p-3">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${r.status==="success"?"bg-green-500":r.status==="failed"?"bg-red-500":"bg-yellow-500"}`}></span>
                      {STATUS_LABEL[r.status]}
                    </td>
                    <td className="p-3 text-right">
                       <ActionMenuAudit onView={()=>{setSelected(r);setDetailOpen(true);}} onExportJson={()=>exportJson([r])} onExportCsv={()=>exportCsv([r])}/>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="bg-[#1A243F] p-2 flex justify-between items-center text-xs text-gray-400 border-t border-[#2A3455]">
           <div className="flex items-center gap-2">
              <span>Строк:</span>
              <select className="bg-[#0E1A3A] border border-[#2A3455] rounded p-1 text-white" value={rowsPerPage} onChange={e=>setRowsPerPage(Number(e.target.value))}>
                 <option value={25}>25</option>
                 <option value={50}>50</option>
                 <option value={100}>100</option>
              </select>
           </div>
           <div className="flex gap-1">
              <button className="px-2 py-1 bg-[#0E1A3A] hover:bg-[#2A3455] rounded disabled:opacity-30" onClick={()=>setCurrentPage(1)} disabled={currentPage===1}>&laquo;</button>
              <button className="px-2 py-1 bg-[#0E1A3A] hover:bg-[#2A3455] rounded disabled:opacity-30" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}>&lsaquo;</button>
              <span className="px-3 py-1 bg-[#0E1A3A] rounded border border-[#2A3455] text-white">Стр. {currentPage} из {totalPages||1}</span>
              <button className="px-2 py-1 bg-[#0E1A3A] hover:bg-[#2A3455] rounded disabled:opacity-30" onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages}>&rsaquo;</button>
              <button className="px-2 py-1 bg-[#0E1A3A] hover:bg-[#2A3455] rounded disabled:opacity-30" onClick={()=>setCurrentPage(totalPages)} disabled={currentPage===totalPages}>&raquo;</button>
           </div>
        </div>
      </div>
      
      <AuditDetailPanel open={detailOpen} onClose={()=>setDetailOpen(false)} record={selected}/>
    </div>
  );
}