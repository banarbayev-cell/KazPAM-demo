import { useState, useMemo, useEffect } from "react";
import { Input } from "../components/ui/input";
import ActionMenuSession from "../components/ActionMenuSession";
import SessionDetailPanel from "../components/SessionDetailPanel";
import { getSessions, terminateSession, startSession } from "../api/sessions";
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
   BACKEND MODEL
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

  /* STATE */
  const [sessions, setSessions] = useState<Session[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [startOpen, setStartOpen] = useState(false);
  const [startForm, setStartForm] = useState({
    user: "",
    system: "",
    os: "Linux",
    ip: "",
  });

  /* LOAD */
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

  /* ACTIONS */
  const handleTerminate = async (session: Session) => {
    if (session.status !== "active") {
      toast.info("Сессия уже завершена");
      return;
    }

    await terminateSession(session.id);
    toast.success("Сессия завершена");
    loadSessions();
  };

  const handleAudit = (session: Session) => {
    navigate(`/audit?session_id=${session.id}`);
  };

  /* FILTER */
  const filtered = useMemo(() => {
    return sessions.filter(
      (s) =>
        (s.user.toLowerCase().includes(search.toLowerCase()) ||
          s.system.toLowerCase().includes(search.toLowerCase()) ||
          s.ip.toLowerCase().includes(search.toLowerCase())) &&
        (statusFilter === "all" || s.status === statusFilter)
    );
  }, [sessions, search, statusFilter]);

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-4">Пользовательские сессии</h1>

      <button
        onClick={() => setStartOpen(true)}
        className="mb-6 px-4 py-2 bg-[#0052FF] text-white rounded"
      >
        Запустить сессию
      </button>

      <Input
        placeholder="Поиск по пользователю, системе или IP..."
        className="w-80 mb-4 bg-white"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="bg-[#121A33] rounded-xl overflow-hidden">
        <table className="w-full text-white text-sm">
          <thead className="bg-[#1A243F] text-gray-300">
            <tr>
              <th className="p-3 text-left">Пользователь</th>
              <th className="p-3">Система</th>
              <th className="p-3">OS</th>
              <th className="p-3">IP</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.id}
                className="border-t border-[#1E2A45] hover:bg-[#0E1A3A]"
              >
                <td className="p-3">{s.user}</td>
                <td className="p-3">{s.system}</td>
                <td className="p-3">{s.os}</td>
                <td className="p-3">{s.ip}</td>
                <td className="p-3">{s.status}</td>
                <td className="p-3">
                  <ActionMenuSession
                    onView={() => {
                      setSelectedSession(s);
                      setDetailOpen(true);
                    }}
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
        onAudit={() =>
          selectedSession && handleAudit(selectedSession)
        }
      />

      {/* START SESSION MODAL */}
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
              <button onClick={() => setStartOpen(false)}>Отмена</button>
              <button
                className="px-4 py-2 bg-[#0052FF] rounded"
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
