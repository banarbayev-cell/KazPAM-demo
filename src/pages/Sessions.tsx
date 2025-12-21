import { useState, useMemo, useEffect } from "react";
import { Input } from "../components/ui/input";
import ActionMenuSession from "../components/ActionMenuSession";
import SessionDetailPanel from "../components/SessionDetailPanel";
import { getSessions, terminateSession } from "../api/sessions";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/* ===============================
   UI MODEL (НЕ МЕНЯЕМ)
================================ */
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

/* ===============================
   BACKEND MODEL (READ ONLY)
================================ */
interface BackendSession {
  id: number;
  user: string;
  system: string;
  os: string;
  ip: string;
  app?: string;
  status: "active" | "closed" | "failed";
  start_time?: string;
}

/* ===============================
   FALLBACK MOCK (ТОЛЬКО ЕСЛИ [] )
================================ */
const MOCK_SESSIONS: Session[] = [
  {
    id: 1,
    user: "admin",
    system: "Linux-Server-01",
    os: "Linux",
    conn: "SSH",
    ip: "192.168.1.10",
    app: "PostgreSQL Admin",
    risk: "Low",
    last_command: "sudo su",
    duration: "14 мин",
    status: "active",
    date: "28.11.2025",
  },
];

/* ===============================
   MAPPER: backend → UI
================================ */
function mapBackendSession(s: BackendSession): Session {
  return {
    id: s.id,
    user: s.user,
    system: s.system,
    os: s.os,
    conn: s.app ?? "SSH",
    ip: s.ip,
    app: s.app ?? "SSH",
    risk: "Low",
    last_command: "—",
    duration: "—",
    status: s.status,
    date: s.start_time ?? "",
  };
}

export default function Sessions() {
  const navigate = useNavigate();

  /* ===============================
     STATE
  ================================ */
  const [sessions, setSessions] = useState<Session[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* ===============================
     LOAD SESSIONS
  ================================ */
  const loadSessions = () => {
    getSessions()
      .then((data: BackendSession[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setSessions(data.map(mapBackendSession));
        } else {
          // fallback для demo / pilot
          setSessions(MOCK_SESSIONS);
        }
      })
      .catch(() => {
        setSessions(MOCK_SESSIONS);
        toast.error("Не удалось загрузить сессии, показаны тестовые данные");
      });
  };

  useEffect(() => {
    loadSessions();
  }, []);

  /* ===============================
     OPEN DETAILS
  ================================ */
  const openDetails = (session: Session) => {
    setSelectedSession(session);
    setDetailOpen(true);
  };

  /* ===============================
     ACTIONS
  ================================ */
  const handleTerminate = async (session: Session) => {
    if (session.status !== "active") {
      toast.info("Сессия уже завершена");
      return;
    }

    try {
      await terminateSession(session.id);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === session.id ? { ...s, status: "closed" } : s
        )
      );

      setSelectedSession((prev) =>
        prev && prev.id === session.id
          ? { ...prev, status: "closed" }
          : prev
      );

      toast.success("Сессия завершена");
    } catch {
      toast.error("Не удалось завершить сессию");
    }
  };

  const handleAudit = (session: Session) => {
    navigate(`/audit?session_id=${session.id}`);
  };

  /* ===== handlers для панели ===== */
  const handlePanelTerminate = async () => {
    if (!selectedSession) return;
    await handleTerminate(selectedSession);
  };

  const handlePanelAudit = () => {
    if (!selectedSession) return;
    handleAudit(selectedSession);
  };

  const handlePanelDownloadLogs = () => {
    toast.info("Экспорт логов будет добавлен позже");
  };

  /* ===============================
     STATS
  ================================ */
  const total = sessions.length;
  const activeCount = sessions.filter((s) => s.status === "active").length;
  const closedCount = sessions.filter((s) => s.status === "closed").length;
  const failedCount = sessions.filter((s) => s.status === "failed").length;

  /* ===============================
     FILTER + SEARCH
  ================================ */
  const filtered = useMemo(() => {
    return sessions.filter(
      (s) =>
        (s.user.toLowerCase().includes(search.toLowerCase()) ||
          s.system.toLowerCase().includes(search.toLowerCase()) ||
          s.ip.toLowerCase().includes(search.toLowerCase())) &&
        (statusFilter === "all" || s.status === statusFilter)
    );
  }, [sessions, search, statusFilter]);

  /* ===============================
     PAGINATION
  ================================ */
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentRows = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-1">Пользовательские сессии</h1>
      <p className="text-gray-600 mb-6 text-lg">
        Мониторинг активных и завершённых сессий
      </p>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Stat title="Всего" value={total} />
        <Stat title="Активные" value={activeCount} color="text-green-400" />
        <Stat title="Завершённые" value={closedCount} color="text-blue-400" />
        <Stat title="Ошибочные" value={failedCount} color="text-red-400" />
      </div>

      {/* FILTERS */}
      <div className="flex gap-3 items-center mb-6">
        <Input
          placeholder="Поиск по пользователю, системе или IP..."
          className="w-80 bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="bg-white border rounded-lg p-2"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="closed">Завершённые</option>
          <option value="failed">Ошибочные</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-y-auto max-h-[500px] rounded-xl border bg-[#121A33]">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300 sticky top-0">
            <tr>
              <th className="p-3 text-left">Пользователь</th>
              <th className="p-3 text-left">Система</th>
              <th className="p-3 text-left">OS</th>
              <th className="p-3 text-left">Метод</th>
              <th className="p-3 text-left">IP</th>
              <th className="p-3 text-left">Статус</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>

          <tbody>
            {currentRows.map((session) => (
              <tr
                key={session.id}
                className="border-t border-[#1E2A45] hover:bg-[#0E1A3A]"
              >
                <td className="p-3">{session.user}</td>
                <td className="p-3">{session.system}</td>
                <td className="p-3">{session.os}</td>
                <td className="p-3">{session.conn}</td>
                <td className="p-3">{session.ip}</td>

                <td className="p-3">
                  {session.status === "active" && (
                    <span className="px-3 py-1 bg-green-700 rounded-full text-xs">
                      Активна
                    </span>
                  )}
                  {session.status === "closed" && (
                    <span className="px-3 py-1 bg-blue-700 rounded-full text-xs">
                      Завершена
                    </span>
                  )}
                  {session.status === "failed" && (
                    <span className="px-3 py-1 bg-red-700 rounded-full text-xs">
                      Ошибка
                    </span>
                  )}
                </td>

                <td className="p-3">
                  <ActionMenuSession
                    onView={() => openDetails(session)}
                    onTerminate={() => handleTerminate(session)}
                    onAudit={() => handleAudit(session)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETAIL PANEL */}
      <SessionDetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        session={selectedSession}
        onTerminate={handlePanelTerminate}
        onAudit={handlePanelAudit}
        onDownloadLogs={handlePanelDownloadLogs}
      />

      {/* PAGINATION */}
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

        <span>
          {currentPage} / {totalPages}
        </span>
      </div>
    </div>
  );
}

/* ===============================
   STAT
================================ */
function Stat({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-[#121A33] p-4 rounded-xl text-white">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className={`text-3xl font-bold ${color ?? ""}`}>{value}</p>
    </div>
  );
}
