import { useState, useMemo } from "react";
import { Input } from "../components/ui/input";
import ActionMenuSession from "../components/ActionMenuSession";
import SessionDetailPanel from "../components/SessionDetailPanel";

interface Session {
  id: number;
  user: string;
  system: string;
  os: string;
  conn: string;
  ip: string;
  app: string;
  risk: string;
  last_command: string;
  duration: string;
  status: "active" | "closed" | "failed";
  date: string;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([
    { id: 1, user: "admin", system: "Linux-Server-01", os: "Linux", conn: "SSH", ip: "192.168.1.10", app: "PostgreSQL Admin", risk: "Low", last_command: "sudo su", duration: "14 мин", status: "active", date: "28.11.2025" },
    { id: 2, user: "security", system: "Windows-DC-01", os: "Windows", conn: "RDP", ip: "10.0.0.5", app: "Active Directory MMC", risk: "Medium", last_command: "gpupdate /force", duration: "5 мин", status: "closed", date: "27.11.2025" },
    { id: 3, user: "operator01", system: "Cisco-Switch-9300", os: "Network", conn: "Console", ip: "172.16.0.3", app: "Cisco IOS Terminal", risk: "High", last_command: "show config", duration: "1 мин", status: "failed", date: "26.11.2025" },
    { id: 4, user: "solaris_ops", system: "Solaris-Core-DB", os: "Solaris", conn: "SSH", ip: "10.22.14.91", app: "Oracle DB 12c", risk: "Critical", last_command: "drop user backup_01 cascade", duration: "22 мин", status: "active", date: "03.12.2025" },
  ]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const openDetails = (session: Session) => {
    setSelectedSession(session);
    setDetailOpen(true);
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Stats
  const total = sessions.length;
  const activeCount = sessions.filter(s => s.status === "active").length;
  const closedCount = sessions.filter(s => s.status === "closed").length;
  const failedCount = sessions.filter(s => s.status === "failed").length;

  // Filter + search
  const filtered = useMemo(() => {
    return sessions.filter(s =>
      (s.user.toLowerCase().includes(search.toLowerCase()) ||
        s.system.toLowerCase().includes(search.toLowerCase()) ||
        s.ip.toLowerCase().includes(search.toLowerCase())) &&
      (statusFilter === "all" || s.status === statusFilter)
    );
  }, [sessions, search, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const currentRows = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-1">Пользовательские сессии</h1>
      <p className="text-gray-600 mb-6 text-lg">Мониторинг активных и завершённых сессий пользователей</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[#121A33] p-4 rounded-xl shadow-md text-white">
          <p className="text-gray-400 text-sm">Всего сессий</p>
          <p className="text-3xl font-bold">{total}</p>
        </div>
        <div className="bg-[#121A33] p-4 rounded-xl shadow-md text-white">
          <p className="text-gray-400 text-sm">Активные</p>
          <p className="text-3xl font-bold text-green-400">{activeCount}</p>
        </div>
        <div className="bg-[#121A33] p-4 rounded-xl shadow-md text-white">
          <p className="text-gray-400 text-sm">Завершённые</p>
          <p className="text-3xl font-bold text-blue-400">{closedCount}</p>
        </div>
        <div className="bg-[#121A33] p-4 rounded-xl shadow-md text-white">
          <p className="text-gray-400 text-sm">Ошибочные</p>
          <p className="text-3xl font-bold text-red-400">{failedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center mb-6">
        <Input
          placeholder="Поиск по пользователю, системе или IP..."
          className="w-80 bg-white border text-gray-900 placeholder-gray-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="bg-white border border-gray-300 rounded-lg p-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="closed">Завершенные</option>
          <option value="failed">Ошибочные</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-y-auto max-h-[500px] rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33]">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left">Пользователь</th>
              <th className="p-3 text-left">Система</th>
              <th className="p-3 text-left">Тип системы</th>
              <th className="p-3 text-left">Метод</th>
              <th className="p-3 text-left">IP-адрес</th>
              <th className="p-3 text-left">Приложение / БД</th>
              <th className="p-3 text-left">Последняя команда</th>
              <th className="p-3 text-left">Риск</th>
              <th className="p-3 text-left">Статус</th>
              <th className="p-3 text-left">Дата</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>

          <tbody>
            {currentRows.map(session => (
              <tr key={session.id} className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] transition">
                <td className="p-3">{session.user}</td>
                <td className="p-3 text-gray-300">{session.system}</td>
                <td className="p-3 text-gray-300">{session.os}</td>
                <td className="p-3 text-gray-300">{session.conn}</td>
                <td className="p-3 text-gray-300">{session.ip}</td>
                <td className="p-3 text-gray-300">{session.app}</td>
                <td className="p-3 text-gray-300">{session.last_command}</td>

                <td className="p-3">
                  {session.risk === "Low" && <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-700 text-white">Низкий</span>}
                  {session.risk === "Medium" && <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-600 text-white">Средний</span>}
                  {session.risk === "High" && <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-600 text-white">Высокий</span>}
                  {session.risk === "Critical" && <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-700 text-white">Критический</span>}
                </td>

                <td className="p-3">
                  {session.status === "active" && <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-700 text-white animate-pulse">Активна</span>}
                  {session.status === "closed" && <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-700 text-white">Завершена</span>}
                  {session.status === "failed" && <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-700 text-white">Ошибка</span>}
                </td>

                <td className="p-3 text-gray-300">{session.date}</td>

                <td className="p-3">
                  <ActionMenuSession
                    status={session.status}
                    onTerminate={() =>
                      setSessions(prev =>
                        prev.map(s => s.id === session.id ? { ...s, status: "closed" } : s)
                      )
                    }
                    onRetry={() => console.log("retry session")}
                    onDetails={() => openDetails(session)}
                    onDelete={() =>
                      setSessions(prev =>
                        prev.filter(s => s.id !== session.id)
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      <SessionDetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        session={selectedSession}
      />

      {/* Pagination */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <span>Показать:</span>
          <select
            className="border p-1 rounded"
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
        </div>

        <div className="flex gap-2 items-center">
          <button className="px-2" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
            {"<<"}
          </button>
          <button
            className="px-2"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            {"<"}
          </button>

          <span className="font-medium">
            {currentPage} / {totalPages}
          </span>

          <button
            className="px-2"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            {">"}
          </button>

          <button
            className="px-2"
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
