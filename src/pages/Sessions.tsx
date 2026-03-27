import { useState, useMemo, useEffect } from "react";
import { Input } from "../components/ui/input";
import ActionMenuSession from "../components/ActionMenuSession";
import SessionDetailPanel from "../components/SessionDetailPanel";
import { getAllSessions, terminateSession, startSession } from "../api/sessions";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../store/auth";

/* ===============================
   UI MODEL
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
  status: "active" | "closed" | "failed" | "terminated";
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
  status: "active" | "closed" | "failed" | "terminated";
  start_time?: string;
}

/* ===============================
   HELPERS
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

function extractSessions(payload: unknown): BackendSession[] {
  if (Array.isArray(payload)) {
    return payload as BackendSession[];
  }

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    if (Array.isArray(obj.sessions)) {
      return obj.sessions as BackendSession[];
    }

    if (Array.isArray(obj.items)) {
      return obj.items as BackendSession[];
    }

    if (Array.isArray(obj.data)) {
      return obj.data as BackendSession[];
    }
  }

  return [];
}

function statusLabel(status: Session["status"]) {
  switch (status) {
    case "active":
      return "Активна";
    case "closed":
    case "terminated":
      return "Завершена";
    case "failed":
      return "Ошибка";
    default:
      return status;
  }
}

function statusClass(status: Session["status"]) {
  switch (status) {
    case "active":
      return "inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/30";
    case "closed":
    case "terminated":
      return "inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30";
    case "failed":
      return "inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30";
    default:
      return "inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30";
  }
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const text = error.message?.trim();
    if (text) return text;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallback;
}

function mergeSessions(
  freshSessions: Session[],
  previousSessions: Session[]
): Session[] {
  const historical = previousSessions.filter((s) => s.status !== "active");
  const merged = new Map<number, Session>();

  for (const item of historical) {
    merged.set(item.id, item);
  }

  for (const item of freshSessions) {
    merged.set(item.id, item);
  }

  return Array.from(merged.values()).sort((a, b) => b.id - a.id);
}

export default function Sessions() {
  const navigate = useNavigate();
  const authUser = useAuth((s) => s.user);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter] = useState("all");

  const [startOpen, setStartOpen] = useState(false);
  const [startForm, setStartForm] = useState({
    user: "",
    system: "",
    os: "Linux",
    ip: "",
  });

  const [loading, setLoading] = useState(false);
  const [launchLoading, setLaunchLoading] = useState(false);

  const notifySessionsChanged = () => {
    window.dispatchEvent(new Event("kazpam:sessions-changed"));
  };

  const loadSessions = async () => {
    setLoading(true);

    try {
      const data = await getAllSessions();
      const normalized = extractSessions(data).map(mapBackendSession);

      setSessions((prev) => mergeSessions(normalized, prev));
    } catch (error) {
      setSessions((prev) => prev.filter((s) => s.status !== "active"));
      toast.error(extractErrorMessage(error, "Не удалось загрузить сессии"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (!startOpen) return;

    setStartForm((prev) => ({
      ...prev,
      user: prev.user || authUser?.email || "",
    }));
  }, [startOpen, authUser?.email]);

  const handleTerminate = async (session: Session) => {
    if (session.status !== "active") {
      toast.info("Сессия уже завершена");
      return;
    }

    try {
      await terminateSession(session.id);

      setSessions((prev): Session[] =>
        prev
          .map((s): Session =>
            s.id === session.id
              ? {
                  ...s,
                  status: "terminated" as const,
                }
              : s
          )
          .sort((a, b) => b.id - a.id)
      );

      setSelectedSession((prev) =>
        prev && prev.id === session.id
          ? {
              ...prev,
              status: "terminated" as const,
            }
          : prev
      );

      toast.success("Сессия завершена");
      notifySessionsChanged();

      await loadSessions();
    } catch (error) {
      toast.error(
        extractErrorMessage(error, "Не удалось завершить сессию")
      );
    }
  };

  const handleAudit = (session: Session) => {
    navigate(`/audit?session_id=${session.id}`);
  };

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
            {loading ? (
              <tr className="border-t border-[#1E2A45]">
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  Загрузка сессий...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr className="border-t border-[#1E2A45]">
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  Сессии не найдены
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-[#1E2A45] hover:bg-[#0E1A3A]"
                >
                  <td className="p-3">{s.user}</td>
                  <td className="p-3">{s.system}</td>
                  <td className="p-3">{s.os}</td>
                  <td className="p-3">{s.ip}</td>
                  <td className="p-3">
                    <span className={statusClass(s.status)}>
                      {statusLabel(s.status)}
                    </span>
                  </td>
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
              ))
            )}
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

      {startOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#121A33] p-6 rounded-xl w-[420px] text-white space-y-4">
            <h2 className="text-lg font-semibold">Запуск сессии</h2>

            <div className="space-y-1">
              <div className="text-sm text-gray-400">Инициатор</div>
              <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-sm">
                {authUser?.email || "—"}
              </div>
            </div>

            <Input
              placeholder="Пользователь / учётная запись"
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
                disabled={launchLoading}
              >
                Отмена
              </button>

              <button
                disabled={launchLoading}
                className="px-4 py-2 bg-[#0052FF] rounded disabled:bg-gray-600"
                onClick={async () => {
                  try {
                    setLaunchLoading(true);

                    await startSession({
                      user: startForm.user,
                      system: startForm.system,
                      os: startForm.os,
                      ip: startForm.ip,
                    });

                    toast.success("Сессия запущена");
                    setStartOpen(false);

                    await loadSessions();
                    notifySessionsChanged();
                  } catch (error) {
                    toast.error(
                      extractErrorMessage(error, "Доступ запрещён политикой")
                    );
                  } finally {
                    setLaunchLoading(false);
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