import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "../components/ui/input";
import ActionMenuAudit from "../components/ActionMenuAudit";
import { apiGet } from "../api/client";
import { useNavigate } from "react-router-dom";
// 👇 ДОБАВИЛ RefreshCw СЮДА
import { CheckCircle2, XCircle, AlertTriangle, Activity, RefreshCw } from "lucide-react";
import { formatKzDateTime, parseBackendDate } from "../utils/time";

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
  if (c.includes("user")) return "users";
  if (c.includes("vault")) return "vault";
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
  const parsed = parseBackendDate(rawTime, { naiveInput: "utc" });
  const details = normalizeDetails(log.details);
  const ip = details.ip ?? details.source_ip ?? "—";

  return {
    id: log.id,
    time: formatKzDateTime(rawTime, { seconds: true, naiveInput: "utc" }),
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

// --- Detail Panel ---
function AuditDetailPanel({open,onClose,record}:{open:boolean;onClose:()=>void;record:AuditRecord|null;}){
  const navigate = useNavigate();
  if(!open||!record)return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-[9999]">
      <div className="w-[420px] bg-[#121A33] h-full p-6 text-white overflow-y-auto shadow-2xl border-l border-gray-700 flex flex-col">
        <div className="flex-grow">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Activity size={20} className="text-blue-400"/>
                Событие #{record.id}
            </h2>
            
            <div className="space-y-4 text-sm">
            <div className="bg-[#1A243F] p-3 rounded-lg border border-[#2A3455]">
                <div className="text-gray-400 text-xs mb-1">Время</div>
                <div className="font-mono text-white">{record.time}</div>
            </div>

            <div className="bg-[#1A243F] p-3 rounded-lg border border-[#2A3455]">
                <div className="text-gray-400 text-xs mb-1">Пользователь</div>
                <div className="font-medium text-white">{record.user}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1A243F] p-3 rounded-lg border border-[#2A3455]">
                    <div className="text-gray-400 text-xs mb-1">Категория</div>
                    <div className="uppercase text-xs font-bold tracking-wider bg-blue-900/50 text-blue-200 px-2 py-1 rounded w-max">
                        {record.category}
                    </div>
                </div>
                <div className="bg-[#1A243F] p-3 rounded-lg border border-[#2A3455]">
                    <div className="text-gray-400 text-xs mb-1">Статус</div>
                    <div className={`font-bold flex items-center gap-1 ${record.status==="success"?"text-green-400":record.status==="failed"?"text-red-400":"text-orange-400"}`}>
                        {record.status==="success" && <CheckCircle2 size={14}/>}
                        {record.status==="failed" && <XCircle size={14}/>}
                        {STATUS_LABEL[record.status]}
                    </div>
                </div>
            </div>

            <div className="bg-[#1A243F] p-3 rounded-lg border border-[#2A3455]">
                <div className="text-gray-400 text-xs mb-1">Действие</div>
                <div className="text-yellow-400 font-mono break-all">{record.action}</div>
            </div>

            <div className="bg-[#1A243F] p-3 rounded-lg border border-[#2A3455]">
                <div className="text-gray-400 text-xs mb-1">IP Адрес</div>
                <div className="font-mono text-gray-300">{record.ip}</div>
            </div>
            
            <div className="mt-6">
                <div className="text-xs font-semibold mb-2 text-gray-400 uppercase">Технические детали (JSON)</div>
                <div className="bg-[#0B1221] p-3 rounded border border-[#1E2A45] overflow-x-auto max-h-60">
                    <pre className="text-xs text-green-400 font-mono">{JSON.stringify(record.details,null,2)}</pre>
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
                {record.details?.target_user_id && <button onClick={()=>navigate(`/users/${record.details.target_user_id}`)} className="w-full px-4 py-2 bg-[#2A3455] hover:bg-[#3A456B] rounded text-sm transition">Открыть профиль пользователя</button>}
                {record.details?.role_id && <button onClick={()=>navigate(`/roles`)} className="w-full px-4 py-2 bg-[#2A3455] hover:bg-[#3A456B] rounded text-sm transition">Перейти к ролям</button>}
            </div>
            </div>
        </div>

        <button onClick={onClose} className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition shadow-lg">Закрыть</button>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function Audit(){
  const [records,setRecords]=useState<AuditRecord[]>([]);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("all");
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
  const warningCount=filtered.filter(r=>r.status==="warning").length;

  return (
    <div className="p-6 w-full bg-gray-100 min-h-screen text-gray-900 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#121A33]">Журнал аудита</h1>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition text-sm font-medium">
           <RefreshCw size={16}/> Обновить
        </button>
      </div>

      {/* --- Новая компактная статистика (Карточки) --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Всего событий</span>
            <span className="text-3xl font-bold text-gray-800">{filtered.length}</span>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-green-500 flex items-center justify-between px-6">
            <div>
                <span className="text-gray-500 text-xs uppercase font-bold tracking-wider block mb-1">Успешно</span>
                <span className="text-2xl font-bold text-green-600">{successCount}</span>
            </div>
            <CheckCircle2 size={32} className="text-green-100"/>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-red-500 flex items-center justify-between px-6">
            <div>
                <span className="text-gray-500 text-xs uppercase font-bold tracking-wider block mb-1">Ошибки</span>
                <span className="text-2xl font-bold text-red-600">{failedCount}</span>
            </div>
            <XCircle size={32} className="text-red-100"/>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-yellow-500 flex items-center justify-between px-6">
            <div>
                <span className="text-gray-500 text-xs uppercase font-bold tracking-wider block mb-1">Предупреждения</span>
                <span className="text-2xl font-bold text-yellow-600">{warningCount}</span>
            </div>
            <AlertTriangle size={32} className="text-yellow-100"/>
         </div>
      </div>

      {/* --- Фильтры --- */}
      <div className="flex flex-wrap gap-3 items-center mb-4 bg-white p-3 rounded-lg border shadow-sm">
        <Input placeholder="Поиск (User, Action, IP)..." className="w-72 border-gray-300" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select value={category} onChange={e=>setCategory(e.target.value)} className="border border-gray-300 p-2 rounded-md bg-gray-50 text-sm h-10 focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">Все категории</option>
          <option value="auth">Auth</option>
          <option value="users">Users</option>
          <option value="role">Roles</option>
          <option value="policy">Policies</option>
          <option value="session">Sessions</option>
          <option value="soc">SOC</option>
          <option value="vault">Vault</option>
          <option value="system">System</option>
        </select>
        <div className="flex-grow"></div>
        <button onClick={()=>exportCsv(filtered)} className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-md text-sm font-medium text-gray-700">Скачать CSV</button>
      </div>

      {/* --- Таблица --- */}
      <div className="flex-grow overflow-hidden rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33] flex flex-col">
        <div className="overflow-auto flex-grow">
          <table className="w-full text-sm text-white">
            <thead className="bg-[#1A243F] text-gray-300 sticky top-0 z-10 shadow-md uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="p-4 text-left w-48">Время</th>
                <th className="p-4 text-left">Пользователь</th>
                <th className="p-4 text-left w-32">Категория</th>
                <th className="p-4 text-left">Действие</th>
                <th className="p-4 text-left w-40">IP</th>
                <th className="p-4 text-left w-32">Статус</th>
                <th className="p-4 text-right w-20"></th>
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
                    <td className="p-4 font-mono text-xs text-gray-400 whitespace-nowrap">{r.time}</td>
                    <td className="p-4 font-medium text-white">{r.user}</td>
                    <td className="p-4"><span className="bg-[#2A3455] px-2 py-1 rounded text-[10px] uppercase tracking-wide text-blue-200 font-bold">{r.category}</span></td>
                    <td className="p-4 text-gray-200 font-mono text-xs">{r.action}</td>
                    <td className="p-4 font-mono text-xs text-gray-400">{r.ip}</td>
                    <td className="p-4">
                      <div className={`flex items-center gap-2 ${r.status==="success"?"text-green-400":r.status==="failed"?"text-red-400":"text-yellow-400"}`}>
                          {r.status==="success" && <CheckCircle2 size={14}/>}
                          {r.status==="failed" && <XCircle size={14}/>}
                          {STATUS_LABEL[r.status]}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                       <ActionMenuAudit onView={()=>{setSelected(r);setDetailOpen(true);}} onExportJson={()=>exportJson([r])} onExportCsv={()=>exportCsv([r])}/>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="bg-[#1A243F] p-3 flex justify-between items-center text-xs text-gray-400 border-t border-[#2A3455]">
           <div className="flex items-center gap-3">
              <span>Показывать по:</span>
              <select className="bg-[#0E1A3A] border border-[#2A3455] rounded px-2 py-1 text-white focus:outline-none" value={rowsPerPage} onChange={e=>setRowsPerPage(Number(e.target.value))}>
                 <option value={25}>25</option>
                 <option value={50}>50</option>
                 <option value={100}>100</option>
              </select>
           </div>
           <div className="flex gap-1 items-center">
              <span className="mr-3">Страница {currentPage} из {totalPages||1}</span>
              <button className="p-1.5 bg-[#0E1A3A] hover:bg-[#2A3455] rounded disabled:opacity-30 transition" onClick={()=>setCurrentPage(1)} disabled={currentPage===1}>&laquo;</button>
              <button className="p-1.5 bg-[#0E1A3A] hover:bg-[#2A3455] rounded disabled:opacity-30 transition" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}>&lsaquo;</button>
              
              <button className="p-1.5 bg-[#0E1A3A] hover:bg-[#2A3455] rounded disabled:opacity-30 transition" onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages}>&rsaquo;</button>
              <button className="p-1.5 bg-[#0E1A3A] hover:bg-[#2A3455] rounded disabled:opacity-30 transition" onClick={()=>setCurrentPage(totalPages)} disabled={currentPage===totalPages}>&raquo;</button>
           </div>
        </div>
      </div>
      
      <AuditDetailPanel open={detailOpen} onClose={()=>setDetailOpen(false)} record={selected}/>
    </div>
  );
}