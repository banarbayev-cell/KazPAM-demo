import { useState, useMemo, useEffect } from "react";
import { Input } from "../components/ui/input";
import ActionMenuSession from "../components/ActionMenuSession";
import SessionDetailPanel from "../components/SessionDetailPanel";
import {
  getAllSessions,
  terminateSession,
  startSession,
  archiveSession,
  exportSessions,
} from "../api/sessions";
import {
  listAccessibleTargets,
  listTargets,
} from "../api/targets";
import type { Target } from "../types/targets";
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
  target_id?: number | null;
  vault_secret_id?: number | null;
  protocol?: string | null;
  gateway_node?: string | null;
  launch_mode?: string | null;
  details?: string | null;
  pam_user?: string | null;
  is_archived?: boolean;
  archived_at?: string | null;
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
  target_id?: number | null;
  vault_secret_id?: number | null;
  protocol?: string | null;
  gateway_node?: string | null;
  launch_mode?: string | null;
  details?: string | null;
  pam_user?: string | null;
  status: "active" | "closed" | "failed" | "terminated";
  start_time?: string;
  is_archived?: boolean;
  archived_at?: string | null;
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
    target_id: s.target_id ?? null,
    vault_secret_id: s.vault_secret_id ?? null,
    protocol: s.protocol ?? null,
    gateway_node: s.gateway_node ?? null,
    launch_mode: s.launch_mode ?? null,
    details: s.details ?? null,
    pam_user: s.pam_user ?? null,
    is_archived: s.is_archived ?? false,
    archived_at: s.archived_at ?? null,
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

  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    (error as any).response?.data?.detail
  ) {
    return String((error as any).response.data.detail);
  }

  return fallback;
}


function findRecentlyCreatedSession(
  sessions: Session[],
  options: {
    targetId?: number | null;
    system?: string;
    ip?: string;
    user?: string;
  }
): Session | null {
  if (!sessions.length) return null;

  const normalizedUser = (options.user || "").trim().toLowerCase();
  const normalizedSystem = (options.system || "").trim().toLowerCase();
  const normalizedIp = (options.ip || "").trim().toLowerCase();

  const exactByTarget =
    options.targetId != null
      ? sessions.find(
          (s) =>
            s.target_id === options.targetId &&
            s.status === "active"
        ) || null
      : null;

  if (exactByTarget) return exactByTarget;

  const byManualFields =
    sessions.find((s) => {
      const sameUser =
        !normalizedUser ||
        String(s.user || "").trim().toLowerCase() === normalizedUser;

      const sameSystem =
        !normalizedSystem ||
        String(s.system || "").trim().toLowerCase() === normalizedSystem;

      const sameIp =
        !normalizedIp ||
        String(s.ip || "").trim().toLowerCase() === normalizedIp;

      return sameUser && sameSystem && sameIp && s.status === "active";
    }) || null;

  if (byManualFields) return byManualFields;

  return sessions.find((s) => s.status === "active") || null;
}


function isActiveSshSession(
  session: Pick<Session, "protocol" | "app" | "conn" | "status">
): boolean {
  const protocol = String(
    session.protocol || session.app || session.conn || ""
  )
    .trim()
    .toLowerCase();

  return protocol === "ssh" && session.status === "active";
}

// Для archive/filter/export режимов mergeSessions больше не нужен.
// Список всегда берём заново с backend по текущим фильтрам.

export default function Sessions() {
  const navigate = useNavigate();
  const authUser = useAuth((s) => s.user);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [archiveMode, setArchiveMode] = useState<"main" | "archived">("main");

  const [startOpen, setStartOpen] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({
    user: "",
    system: "",
    os: "Linux",
    ip: "",
  });

  const [loading, setLoading] = useState(false);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [launchLoading, setLaunchLoading] = useState(false);
  const [launchResultOpen, setLaunchResultOpen] = useState(false);
  const [launchedSession, setLaunchedSession] = useState<Session | null>(null);

  const notifySessionsChanged = () => {
    window.dispatchEvent(new Event("kazpam:sessions-changed"));
  };

  const loadSessions = async (): Promise<Session[]> => {
    setLoading(true);

    try {
      const data = await getAllSessions(
        200,
        archiveMode === "archived",
        statusFilter
      );
      const normalized = extractSessions(data)
        .map(mapBackendSession)
        .sort((a, b) => b.id - a.id);

      setSessions(normalized);
      return normalized;
    } catch (error) {
      setSessions([]);
      toast.error(extractErrorMessage(error, "Не удалось загрузить сессии"));
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadTargets = async () => {
  setTargetsLoading(true);

  try {
    const accessible = await listAccessibleTargets("ssh");
    const accessibleSsh = Array.isArray(accessible)
      ? accessible.filter(
          (t) =>
            String(t.protocol || "").toLowerCase() === "ssh" &&
            t.is_active !== false
        )
      : [];

    if (accessibleSsh.length > 0) {
      setTargets(accessibleSsh);
      return;
    }

    const all = await listTargets();
    const sshOnly = Array.isArray(all)
      ? all.filter(
          (t) =>
            String(t.protocol || "").toLowerCase() === "ssh" &&
            t.is_active !== false
        )
      : [];

    setTargets(sshOnly);
  } catch (error) {
    setTargets([]);
    toast.error(
      extractErrorMessage(error, "Не удалось загрузить список систем")
    );
  } finally {
    setTargetsLoading(false);
  }
};

  useEffect(() => {
    loadSessions();
  }, [archiveMode, statusFilter]);
  
  useEffect(() => {
    loadTargets();
  }, []);  

  useEffect(() => {
    if (!startOpen) return;

    setManualForm((prev) => ({
      ...prev,
      user: prev.user || authUser?.email || "",
    }));
  }, [startOpen, authUser?.email]);

  const sshTargets = useMemo(() => {
    return targets.filter(
      (t) =>
        String(t.protocol || "").toLowerCase() === "ssh" &&
        t.is_active !== false
    );
  }, [targets]);

  const selectedTarget = useMemo(() => {
    const id = Number(selectedTargetId);
    if (!Number.isFinite(id)) return null;
    return sshTargets.find((t) => t.id === id) || null;
  }, [sshTargets, selectedTargetId]);

  const openSession = (session: Session) => {
    if (isActiveSshSession(session)) {
      navigate(`/sessions/${session.id}/connect`);
      return;
    }

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
        s.user.toLowerCase().includes(search.toLowerCase()) ||
        s.system.toLowerCase().includes(search.toLowerCase()) ||
        s.ip.toLowerCase().includes(search.toLowerCase())
    );
  }, [sessions, search]);

  const handleArchive = async (session: Session) => {
    if (session.status === "active") {
      toast.info("Активную сессию сначала нужно завершить");
      return;
    }

    if (session.is_archived) {
      toast.info("Сессия уже в архиве");
      return;
    }

    try {
      await archiveSession(session.id);
      toast.success("Сессия архивирована");
      await loadSessions();
      notifySessionsChanged();
    } catch (error) {
      toast.error(extractErrorMessage(error, "Не удалось архивировать сессию"));
    }
  };

  const handleExportCsv = async () => {
    try {
      await exportSessions("csv", archiveMode === "archived", statusFilter);
      toast.success("CSV экспорт выполнен");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Не удалось экспортировать CSV"));
    }
  };

  const handleExportJson = async () => {
    try {
      await exportSessions("json", archiveMode === "archived", statusFilter);
      toast.success("JSON экспорт выполнен");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Не удалось экспортировать JSON"));
    }
  };

  const handleLaunch = async () => {
    try {
      setLaunchLoading(true);

      let startResponse: Awaited<ReturnType<typeof startSession>> | null = null;

      if (!manualMode) {
        if (!selectedTarget) {
          toast.error("Выберите целевую систему");
          return;
        }

        startResponse = await startSession({
          user:
            selectedTarget.username?.trim() ||
            authUser?.email ||
            "unknown",
          target_id: selectedTarget.id,
          app: "SSH",
          mfa_passed: false,
        });
      } else {
        startResponse = await startSession({
          user: manualForm.user,
          system: manualForm.system,
          os: manualForm.os,
          ip: manualForm.ip,
          app: "SSH",
          mfa_passed: false,
        });
      }

      setStartOpen(false);

      const freshSessions = await loadSessions();
      notifySessionsChanged();

      const startedSessionId =
        startResponse?.session?.id ?? startResponse?.id ?? null;

      const matchedSession =
        (startedSessionId
          ? freshSessions.find((s) => s.id === startedSessionId) || null
          : null) ||
        findRecentlyCreatedSession(freshSessions, {
          targetId: !manualMode ? selectedTarget?.id ?? null : null,
          system: manualMode ? manualForm.system : selectedTarget?.name,
          ip: manualMode ? manualForm.ip : selectedTarget?.host,
          user:
            !manualMode
              ? selectedTarget?.username?.trim() || authUser?.email || ""
              : manualForm.user,
        });

      if (matchedSession) {
        setLaunchedSession(matchedSession);
        setSelectedSession(matchedSession);
        setLaunchResultOpen(true);
      }

      setSelectedTargetId("");
      setManualForm({
        user: authUser?.email || "",
        system: "",
        os: "Linux",
        ip: "",
      });

      toast.success("Сессия создана");
    } catch (error) {
      toast.error(
        extractErrorMessage(error, "Не удалось запустить сессию")
      );
    } finally {
      setLaunchLoading(false);
    }
  };

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-4">Пользовательские сессии</h1>

    <div className="mb-6 flex flex-wrap gap-3 items-center">
      <button
        onClick={() => setStartOpen(true)}
        className="px-4 py-2 bg-[#0052FF] text-white rounded"
      >
        Запустить сессию
      </button>

      <button
        onClick={handleExportCsv}
        className="px-4 py-2 bg-[#1A243F] text-white rounded"
      >
        Экспорт CSV
      </button>

      <button
        onClick={handleExportJson}
        className="px-4 py-2 bg-[#1A243F] text-white rounded"
      >
        Экспорт JSON
      </button>

      <select
        value={archiveMode}
        onChange={(e) => setArchiveMode(e.target.value as "main" | "archived")}
        className="px-3 py-2 rounded border bg-white text-gray-900"
      >
        <option value="main">Основной список</option>
        <option value="archived">Архив</option>
      </select>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="px-3 py-2 rounded border bg-white text-gray-900"
      >
        <option value="all">Все статусы</option>
        <option value="active">Активные</option>
        <option value="terminated">Завершённые</option>
        <option value="failed">Ошибки</option>
      </select>
    </div>

      <Input
        placeholder="Поиск по пользователю, системе или IP..."
        className="w-80 mb-4 bg-white"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="bg-[#121A33] rounded-xl relative overflow-visible border border-[#1E2A45]">
        <table className="w-full text-white text-sm">
          <thead className="bg-[#1A243F] text-gray-300">
            <tr>
              <th className="p-3 text-left">Пользователь</th>
              <th className="p-3">Система</th>
              <th className="p-3">OS</th>
              <th className="p-3">IP</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Архив</th>
              <th className="p-3">Действия</th>
            </tr>
          </thead>
 
          <tbody>
            {loading ? (
              <tr className="border-t border-[#1E2A45]">
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  Загрузка сессий...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr className="border-t border-[#1E2A45]">
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  Сессии не найдены
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] relative"
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
                    {s.is_archived ? (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30">
                        В архиве
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>

                  <td className="p-3 relative overflow-visible">
                    <div className="flex items-center justify-center gap-2 overflow-visible">
                      <button
                        onClick={() => openSession(s)}
                        className="px-3 py-1.5 rounded bg-[#0052FF] text-white text-xs font-medium hover:opacity-90"
                      >
                        {isActiveSshSession(s) ? "Подключиться" : "Открыть"}
                      </button>

                      <ActionMenuSession
                        onTerminate={() => handleTerminate(s)}
                        onAudit={() => handleAudit(s)}
                        onArchive={() => handleArchive(s)}
                        canArchive={s.status !== "active" && !s.is_archived}
                      />
                    </div>
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

      {launchResultOpen && launchedSession && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#121A33] p-6 rounded-xl w-[560px] text-white space-y-4">
            <h2 className="text-lg font-semibold">Сессия создана</h2>

            <div className="text-sm text-gray-300 leading-6">
              Сессия успешно создана и переведена под контроль KazPAM.
              Ниже указаны её параметры.
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-gray-400">ID сессии</div>
                <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45]">
                  {launchedSession.id}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-gray-400">Статус</div>
                <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45]">
                  {statusLabel(launchedSession.status)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-gray-400">Система</div>
                <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45]">
                  {launchedSession.system || "—"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-gray-400">IP</div>
                <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45]">
                  {launchedSession.ip || "—"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-gray-400">Протокол</div>
                <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45] uppercase">
                  {launchedSession.protocol || launchedSession.app || "SSH"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-gray-400">Пользователь</div>
                <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45]">
                  {launchedSession.user || "—"}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#1E2A45] bg-[#0E1A3A] p-4 text-sm text-gray-300 leading-6">
              {launchedSession && isActiveSshSession(launchedSession)
              ? "Сессия создана. Для начала работы откройте экран подключения: там будет готовая SSH-команда для входа через KazPAM Gateway."
              : "Сессия создана и доступна для просмотра и контроля из интерфейса KazPAM."}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setLaunchResultOpen(false);
                }}
                className="px-3 py-2 text-gray-300"
              >
                Закрыть
              </button>

              <button
                onClick={() => {
                  setLaunchResultOpen(false);
                  if (launchedSession) {
                    openSession(launchedSession);
                  }  
                }}
                className="px-4 py-2 bg-[#0052FF] rounded"
              >
                {launchedSession && isActiveSshSession(launchedSession)
                  ? "Перейти к подключению"
                  : "Открыть сессию"}
              </button>
            </div>
          </div>
        </div>
      )}

      {startOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#121A33] p-6 rounded-xl w-[520px] text-white space-y-4">
            <h2 className="text-lg font-semibold">Запуск сессии</h2>

            <div className="space-y-1">
              <div className="text-sm text-gray-400">Инициатор</div>
              <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-sm">
                {authUser?.email || "—"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-gray-400">Целевая система</div>
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-sm text-white"
                disabled={targetsLoading}
              >
                <option value="">
                  {targetsLoading
                    ? "Загрузка систем..."
                    : "Выберите систему"}
                </option>
                {sshTargets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name} — {target.host}:{target.port}
                  </option>
                ))}
              </select>
            </div>

            {selectedTarget && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-400">Host / IP</div>
                    <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-sm">
                      {selectedTarget.host}:{selectedTarget.port}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-gray-400">OS</div>
                    <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-sm">
                      {selectedTarget.os_type || "—"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-gray-400">Protocol</div>
                    <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-sm uppercase">
                      {selectedTarget.protocol || "—"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-gray-400">Учётная запись</div>
                    <div className="px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-sm">
                      {selectedTarget.username || "Будет определена backend"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedTarget.requires_vault_secret && (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Vault required
                    </span>
                  )}
                  {selectedTarget.approval_required && (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Approval required
                    </span>
                  )}
                  {selectedTarget.break_glass_enabled && (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                      Break-glass {selectedTarget.break_glass_ttl_minutes}m
                    </span>
                  )}
                </div>
              </>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setManualMode((prev) => !prev)}
                className="text-xs text-gray-400 underline"
              >
                {manualMode
                  ? "Скрыть ручной режим"
                  : "Ручной режим (admin fallback)"}
              </button>
            </div>

            {manualMode && (
              <div className="space-y-3 pt-2 border-t border-[#1E2A45]">
                <Input
                  placeholder="Пользователь / учётная запись"
                  value={manualForm.user}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, user: e.target.value })
                  }
                />

                <Input
                  placeholder="Система"
                  value={manualForm.system}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, system: e.target.value })
                  }
                />

                <Input
                  placeholder="IP"
                  value={manualForm.ip}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, ip: e.target.value })
                  }
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStartOpen(false)}
                disabled={launchLoading}
              >
                Отмена
              </button>

              <button
                disabled={launchLoading || (!manualMode && !selectedTarget)}
                className="px-4 py-2 bg-[#0052FF] rounded disabled:bg-gray-600"
                onClick={handleLaunch}
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