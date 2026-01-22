import { useState, useMemo, useEffect } from "react";
import { Input } from "../components/ui/input";
import ActionMenuSession from "../components/ActionMenuSession";
import SessionDetailPanel from "../components/SessionDetailPanel";
import {
  getSessions,
  terminateSession,
  startSession,
} from "../api/sessions";
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
   FALLBACK MOCK
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
   MAPPER
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

  const [startOpen, setStartOpen] = useState(false);
  const [startForm, setStartForm] = useState({
    user: "",
    system: "",
    os: "Linux",
    ip: "",
  });

  /* ===============================
     LOAD SESSIONS
  ================================ */
  const loadSessions = () => {
    getSessions()
      .then((data: BackendSession[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setSessions(data.map(mapBackendSession));
        } else {
          setSessions(MOCK_SESSIONS);
        }
      })
      .catch(() => {
        setSessions(MOCK_SESSIONS);
        toast.error("Не удалось загрузить сессии");
      });
  };

  useEffect(() => {
    loadSessions();
  }, []);

  /* ===============================
     ACTIONS
  ================================ */
  const openDetails = (session: Session) => {
    setSelectedSession(session);
    setDetailOpen(true);
  };

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
      toast.success("Сессия завершена");
    } catch {
      toast.error("Не удалось завершить сессию");
    }
  };

  const handleAudit = (session: Session) => {
    navigate(`/audit?session_id=${session.id}`);
  };

  /* ===============================
     STATS
  ================================ */
  const total = sessions.length;
  const activeCount = sessions.filter((s) => s.status === "active").length;
  const closedCount = sessions.filter((s) => s.status === "closed").length;
  const failedCount = sessions.filter((s) => s.status === "failed").length;

  /* ===============================
     FILTER
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentRows = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-1">Пользовательские сессии</h1>
      <p className="text-gray-600 mb-4">
        Мониторинг активных и завершённых сессий
      </p>

      <button
        onClick={() => setStartOpen(true)}
        className="mb-6 px-4 py-2 bg-[#0052FF] text-white rounded"
      >
        Запустить сессию
      </button>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Stat title="Всего" value={total} />
        <Stat title="Активные" value={activeCount} color="text-green-400" />
        <Stat title="Завершённые" value={closedCount} color="text-blue-400" />
        <Stat title="Ошибочные" value={failedCount} color="text-red-400" />
      </div>

      {/* TABLE */}
      <div className="overflow-y-auto rounded-xl border bg-[#121A33]">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F]">
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
            {currentRows.map((s) => (
              <tr key={s.id} className="border-t border-[#1E2A45]">
                <td className="p-3">{s.user}</td>
                <td className="p-3">{s.system}</td>
                <td className="p-3">{s.os}</td>
                <td className="p-3">{s.conn}</td>
                <td className="p-3">{s.ip}</td>
                <td className="p-3">{s.status}</td>
                <td className="p-3">
                  <ActionMenuSession
                    onView={() => openDetails(s)}
                    onTerminate={() => handleTerminate(s)}
                    onAudit={() => handleAudit(s)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SessionDetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        session={selectedSession}
        onTerminate={() =>
          selectedSession && handleTerminate(selectedSession)
        }
        onAudit={() => selectedSession && handleAudit(selectedSession)}
        onDownloadLogs={() => toast.info("Экспорт позже")}
      />

      {startOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#121A33] p-6 rounded-xl w-[420px] text-white space-y-4">
            <h2 className="text-lg font-semibold">Запуск сессии</h2>

            <Input
              placeholder="Пользователь (email)"
              value={startForm.user}
              onChange={(e) =>
                setStartForm({ ...startForm, user: e.target.value })
              }
            />

            <Input
              placeholder="Система"
              value={startForm.system}
              onChange={(e) =>
                setStartForm({ ...startForm, system: e.target.value })
              }
            />

            <Input
              placeholder="IP"
              value={startForm.ip}
              onChange={(e) =>
                setStartForm({ ...startForm, ip: e.target.value })
              }
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStartOpen(false)}
                className="text-gray-300"
              >
                Отмена
              </button>

              <button
                onClick={async () => {
                  try {
                    await startSession(startForm);
                    toast.success("Сессия запущена");
                    setStartOpen(false);
                    loadSessions();
                  } catch (e: any) {
                    toast.error(
                      e?.response?.data?.detail ||
                        "Доступ запрещён политикой"
                    );
                  }
                }}
                className="px-4 py-2 bg-[#0052FF] rounded"
              >
                Запустить
              </button>
            </div>
          </div>
        </div>
      )}
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
