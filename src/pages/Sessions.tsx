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
import { listAccessibleTargets } from "../api/targets";
import type { Target, TargetProtocol } from "../types/targets";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../store/auth";
import { startRdpSession, type RDPSessionStartResponse } from "../api/rdp";
import {
  launchWebAccess,
  type WebAccessLaunchResponse,
} from "../api/webAccess";
import {
  launchDbAccess,
  type DBAccessLaunchResponse,
} from "../api/dbAccess";
import {
  launchVncAccess,
  type VNCAccessLaunchResponse,
} from "../api/vncAccess";

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
  recording_id?: number | null;
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
  recording_id?: number | null;
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
    recording_id: s.recording_id ?? null,
  };
}

function extractSessions(payload: unknown): BackendSession[] {
  if (Array.isArray(payload)) {
    return payload as BackendSession[];
  }

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    if (Array.isArray(obj.sessions)) return obj.sessions as BackendSession[];
    if (Array.isArray(obj.items)) return obj.items as BackendSession[];
    if (Array.isArray(obj.data)) return obj.data as BackendSession[];
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
          (s) => s.target_id === options.targetId && s.status === "active"
        ) || null
      : null;

  if (exactByTarget) return exactByTarget;

  const byFields =
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

  if (byFields) return byFields;

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

type LaunchProtocol = TargetProtocol;

function protocolLabel(protocol: LaunchProtocol) {
  switch (protocol) {
    case "ssh":
      return "SSH";
    case "rdp":
      return "RDP";
    case "https":
      return "HTTPS";
    case "mssql":
      return "MS SQL";
    case "vnc":
      return "VNC";
    default:
      return protocol;
  }
}

function copyTextFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

async function copyText(text: string) {
  if (!text) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // fallback below
  }

  copyTextFallback(text);
}

function getSessionRecordingId(session: Session | null): number | null {
  if (!session) return null;

  if (session.recording_id && Number.isFinite(Number(session.recording_id))) {
    return Number(session.recording_id);
  }

  if (!session.details) return null;

  try {
    const parsed = JSON.parse(session.details);

    const candidates = [
      parsed?.recording_id,
      parsed?.recordingId,
      parsed?.recording?.id,
      parsed?.launch_payload?.recording_id,
      parsed?.payload?.recording_id,
    ];

    for (const value of candidates) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    // ignore non-JSON details
  }

  return null;
}

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
  const [launchProtocol, setLaunchProtocol] = useState<LaunchProtocol>("ssh");
  const [selectedTargetId, setSelectedTargetId] = useState("");

  const [loading, setLoading] = useState(false);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [launchLoading, setLaunchLoading] = useState(false);
  const [launchResultOpen, setLaunchResultOpen] = useState(false);
  const [launchedSession, setLaunchedSession] = useState<Session | null>(null);

  const [webAccessResult, setWebAccessResult] =
    useState<WebAccessLaunchResponse | null>(null);
  const [dbAccessResult, setDbAccessResult] =
    useState<DBAccessLaunchResponse | null>(null);
  const [vncAccessResult, setVncAccessResult] =
    useState<VNCAccessLaunchResponse | null>(null);
  const [rdpLaunchResult, setRdpLaunchResult] =
    useState<RDPSessionStartResponse | null>(null);

  const notifySessionsChanged = () => {
    window.dispatchEvent(new Event("kazpam:sessions-changed"));
  };

  const loadSessions = async (options?: {
    archived?: boolean;
    status?: string;
  }): Promise<Session[]> => {
    setLoading(true);

    try {
      const data = await getAllSessions(
        200,
        options?.archived ?? archiveMode === "archived",
        options?.status ?? statusFilter
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

  const loadTargets = async (protocol: LaunchProtocol = launchProtocol) => {
    setTargetsLoading(true);

    try {
      const accessible = await listAccessibleTargets(protocol);
      const filteredByProtocol = Array.isArray(accessible)
        ? accessible.filter(
            (t) =>
              String(t.protocol || "").toLowerCase() === protocol &&
              t.is_active !== false
          )
        : [];

      setTargets(filteredByProtocol);
    } catch (error) {
      setTargets([]);
      toast.error(
        extractErrorMessage(error, "Не удалось загрузить список доступных систем")
      );
    } finally {
      setTargetsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [archiveMode, statusFilter]);

  useEffect(() => {
    if (!startOpen) return;

    setSelectedTargetId("");
    loadTargets(launchProtocol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startOpen, launchProtocol]);

  const protocolTargets = useMemo(() => {
    return targets.filter(
      (t) =>
        String(t.protocol || "").toLowerCase() === launchProtocol &&
        t.is_active !== false
    );
  }, [targets, launchProtocol]);

  const selectedTarget = useMemo(() => {
    const id = Number(selectedTargetId);
    if (!Number.isFinite(id)) return null;
    return protocolTargets.find((t) => t.id === id) || null;
  }, [protocolTargets, selectedTargetId]);

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
            s.id === session.id ? { ...s, status: "terminated" as const } : s
          )
          .sort((a, b) => b.id - a.id)
      );

      setSelectedSession((prev) =>
        prev && prev.id === session.id
          ? { ...prev, status: "terminated" as const }
          : prev
      );

      toast.success("Сессия завершена");
      notifySessionsChanged();

      await loadSessions();
    } catch (error) {
      toast.error(extractErrorMessage(error, "Не удалось завершить сессию"));
    }
  };

  const handleAudit = (session: Session) => {
    navigate(`/audit?session_id=${session.id}`);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return sessions;

    return sessions.filter((s) => {
      return (
        String(s.id).includes(q) ||
        String(s.target_id ?? "").includes(q) ||
        String(s.vault_secret_id ?? "").includes(q) ||
        String(s.recording_id ?? "").includes(q) ||
        String(s.protocol ?? "").toLowerCase().includes(q) ||
        String(s.launch_mode ?? "").toLowerCase().includes(q) ||
        s.user.toLowerCase().includes(q) ||
        s.system.toLowerCase().includes(q) ||
        s.ip.toLowerCase().includes(q)
      );
    });
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

      if (!selectedTarget) {
        toast.error("Выберите целевую систему");
        return;
      }

      if (launchProtocol === "ssh") {
        const targetUsername = selectedTarget.username?.trim();
        if (!targetUsername) {
          toast.error("Для выбранной SSH-системы не задана учётная запись");
          return;
        }

        const startResponse = await startSession({
          user: targetUsername,
          target_id: selectedTarget.id,
          app: "SSH",
          mfa_passed: false,
        });

        setStartOpen(false);

        const freshSessions = await loadSessions();
        notifySessionsChanged();

        const startedSessionId =
          (startResponse as any)?.session?.id ?? (startResponse as any)?.id ?? null;

        const matchedSession =
          (startedSessionId
            ? freshSessions.find((s) => s.id === startedSessionId) || null
            : null) ||
          findRecentlyCreatedSession(freshSessions, {
            targetId: selectedTarget.id,
            system: selectedTarget.name,
            ip: selectedTarget.host,
            user: targetUsername,
          });

        if (matchedSession) {
          setLaunchedSession(matchedSession);
          setSelectedSession(matchedSession);

          if (isActiveSshSession(matchedSession)) {
            toast.success("SSH-сессия создана. Открываем экран подключения...");
            navigate(`/sessions/${matchedSession.id}/connect`);
          } else {
            setLaunchResultOpen(true);
          }
        }

        setSelectedTargetId("");

        if (!matchedSession) {
          toast.success("SSH-сессия создана");
        }

        return;
      }

      if (launchProtocol === "https") {
        const result = await launchWebAccess(selectedTarget.id);

        setArchiveMode("main");
        setStatusFilter("all");
        setWebAccessResult(result);
        setStartOpen(false);

        await loadSessions({
          archived: false,
          status: "all",
        });
        notifySessionsChanged();

        toast.success(`HTTPS access подготовлен · session #${result.session_id}`);
        return;
      }

      if (launchProtocol === "rdp") {
        const result = await startRdpSession({
          target_id: selectedTarget.id,
        });

        setArchiveMode("main");
        setStatusFilter("all");
        setRdpLaunchResult(result);
        setStartOpen(false);

        await loadSessions({
          archived: false,
          status: "all",
        });
        notifySessionsChanged();

        toast.success(
          result.common_session_id
            ? `RDP launch создан · RDP #${result.id} · session #${result.common_session_id}`
            : `RDP launch создан · RDP #${result.id}`
        );
        return;
      }

      if (launchProtocol === "mssql") {
        const result = await launchDbAccess(selectedTarget.id);

        setArchiveMode("main");
        setStatusFilter("all");
        setDbAccessResult(result);
        setStartOpen(false);

        await loadSessions({
          archived: false,
          status: "all",
        });
        notifySessionsChanged();

        toast.success(`MS SQL access подготовлен · session #${result.session_id}`);
        return;
      }

      if (launchProtocol === "vnc") {
        const result = await launchVncAccess(selectedTarget.id);

        setArchiveMode("main");
        setStatusFilter("all");
        setVncAccessResult(result);
        setStartOpen(false);

        await loadSessions({
          archived: false,
          status: "all",
        });
        notifySessionsChanged();

        toast.success(`VNC access подготовлен · session #${result.session_id}`);
        return;
      }
    } catch (error) {
      const message = extractErrorMessage(error, "Не удалось запустить доступ");

      if (
        message.includes(
          "Target requires a bound vault secret and active approval before launch"
        )
      ) {
        toast.error(
          "Для этого target нужен Vault Secret и активное согласование. Привяжите секрет к target и создайте/одобрите запрос доступа."
        );
      } else if (
        message.includes("Target requires an active approval grant before launch")
      ) {
        toast.error(
          "Для этого target нужен approval. Создайте и одобрите запрос доступа перед запуском."
        );
      } else if (
        message.includes("Target requires a bound vault secret before launch")
      ) {
        toast.error("Для этого target нужно сначала привязать Vault Secret.");
      } else if (message.includes("Access denied for this target")) {
        toast.error(
          "Нет доступа к этому target. Назначьте роль через Targets → Доступ."
        );
      } else {
        toast.error(message);
      }
    } finally {
      setLaunchLoading(false);
    }
  };

  const activeCount = sessions.filter((s) => s.status === "active").length;
  const completedCount = sessions.filter(
    (s) => s.status === "terminated" || s.status === "closed"
  ).length;
  const failedCount = sessions.filter((s) => s.status === "failed").length;
  const archivedCount = sessions.filter((s) => s.is_archived).length;
  const recordedCount = sessions.filter((s) => getSessionRecordingId(s)).length;

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-4">Пользовательские сессии</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
        <div className="rounded-xl border border-[#1E2A45] bg-[#121A33] p-4 text-white">
          <div className="text-xs text-gray-400">Активные</div>
          <div className="mt-1 text-2xl font-bold text-green-300">{activeCount}</div>
        </div>

        <div className="rounded-xl border border-[#1E2A45] bg-[#121A33] p-4 text-white">
          <div className="text-xs text-gray-400">Завершённые</div>
          <div className="mt-1 text-2xl font-bold text-gray-200">{completedCount}</div>
        </div>

        <div className="rounded-xl border border-[#1E2A45] bg-[#121A33] p-4 text-white">
          <div className="text-xs text-gray-400">Ошибки / denied</div>
          <div className="mt-1 text-2xl font-bold text-red-300">{failedCount}</div>
        </div>

        <div className="rounded-xl border border-[#1E2A45] bg-[#121A33] p-4 text-white">
          <div className="text-xs text-gray-400">С записью</div>
          <div className="mt-1 text-2xl font-bold text-[#3BE3FD]">{recordedCount}</div>
        </div>

        <div className="rounded-xl border border-[#1E2A45] bg-[#121A33] p-4 text-white">
          <div className="text-xs text-gray-400">В архиве</div>
          <div className="mt-1 text-2xl font-bold text-gray-300">{archivedCount}</div>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-blue-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
        <div className="font-semibold text-gray-900 mb-1">Enterprise session control</div>
        <div>
          Архивирование не удаляет сессию, audit и recording. Оно только скрывает завершённую
          сессию из основного списка. Для расследования используйте “Аудит этой сессии” и
          “Replay”, если запись доступна.
        </div>
      </div>

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
        placeholder="Поиск: session ID / user / system / IP / protocol / target / vault / recording..."
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
        onTerminate={() => selectedSession && handleTerminate(selectedSession)}
        onAudit={() => selectedSession && handleAudit(selectedSession)}
        onOpenReplay={() => {
          const recordingId = getSessionRecordingId(selectedSession);
          if (!recordingId) {
            toast.info("Recording недоступен для этой сессии или ещё обрабатывается");
            return;
          }

          navigate(`/recordings/${recordingId}`);
        }}
      />

      {launchResultOpen && launchedSession && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-[#121A33] p-6 rounded-xl w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto text-white space-y-4 border border-[#1E2A45] shadow-2xl">
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

      {webAccessResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-[#121A33] p-6 rounded-xl w-[620px] max-w-[95vw] max-h-[90vh] overflow-y-auto text-white space-y-4 border border-[#1E2A45] shadow-2xl">
            <h2 className="text-lg font-semibold">HTTPS access подготовлен</h2>

            <div className="text-sm text-gray-300 leading-6">
              KazPAM проверил доступ, записал событие в Audit и подготовил URL для открытия.
            </div>

            <div className="rounded-lg bg-[#0E1A3A] border border-[#1E2A45] p-4 text-sm space-y-2">
              <div>Session ID: #{webAccessResult.session_id}</div>
              <div>Target: #{webAccessResult.target_id} · {webAccessResult.target_name}</div>
              <div>Host: {webAccessResult.target_host}:{webAccessResult.target_port}</div>
              <div>Protocol: {webAccessResult.protocol.toUpperCase()}</div>
              <div>Break-glass: {webAccessResult.break_glass ? "Да" : "Нет"}</div>
            </div>

            <div className="rounded-xl border border-[#1E2A45] bg-[#0B1221] p-4 font-mono text-sm text-[#3BE3FD] break-all">
              {webAccessResult.launch_url}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setWebAccessResult(null)}
                className="px-3 py-2 text-gray-300"
              >
                Закрыть
              </button>

              <button
                onClick={async () => {
                  await copyText(webAccessResult.launch_url);
                  toast.success("HTTPS URL скопирован");
                }}
                className="px-4 py-2 rounded bg-[#1A243F] text-white"
              >
                Скопировать URL
              </button>

              <button
                onClick={() =>
                  window.open(webAccessResult.launch_url, "_blank", "noopener,noreferrer")
                }
                className="px-4 py-2 rounded bg-[#0052FF] text-white"
              >
                Открыть HTTPS
              </button>
            </div>
          </div>
        </div>
      )}

      {rdpLaunchResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-[#121A33] p-6 rounded-xl w-[620px] max-w-[95vw] max-h-[90vh] overflow-y-auto text-white space-y-4 border border-[#1E2A45] shadow-2xl">
            <h2 className="text-lg font-semibold">RDP launch создан</h2>

            <div className="text-sm text-gray-300 leading-6">
              KazPAM создал RDP-доступ и grant token. Используйте его для подключения через
              RDP gateway/client flow.
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded bg-[#0E1A3A] border border-[#1E2A45] p-3">
                RDP Session ID: #{rdpLaunchResult.id}
              </div>
              <div className="rounded bg-[#0E1A3A] border border-[#1E2A45] p-3">
                Common Session ID:{" "}
                {rdpLaunchResult.common_session_id
                  ? `#${rdpLaunchResult.common_session_id}`
                  : "—"}
              </div>
              <div className="rounded bg-[#0E1A3A] border border-[#1E2A45] p-3">
                Status: {rdpLaunchResult.status}
              </div>
              <div className="rounded bg-[#0E1A3A] border border-[#1E2A45] p-3">
                Target: {rdpLaunchResult.target_host}:{rdpLaunchResult.target_port}
              </div>
              <div className="rounded bg-[#0E1A3A] border border-[#1E2A45] p-3">
                User: {rdpLaunchResult.target_username || "—"}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-400">Grant token</div>
              <div className="rounded-xl border border-[#1E2A45] bg-[#0B1221] p-4 font-mono text-sm text-[#3BE3FD] break-all">
                {rdpLaunchResult.grant_token}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRdpLaunchResult(null)}
                className="px-3 py-2 text-gray-300"
              >
                Закрыть
              </button>

              <button
                onClick={async () => {
                  await copyText(rdpLaunchResult.grant_token);
                  toast.success("RDP grant token скопирован");
                }}
                className="px-4 py-2 rounded bg-[#1A243F] text-white"
              >
                Скопировать token
              </button>

              <button
                onClick={() => navigate("/audit")}
                className="px-4 py-2 rounded bg-[#0052FF] text-white"
              >
                Перейти в Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {dbAccessResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-[#121A33] p-6 rounded-xl w-[660px] max-w-[95vw] max-h-[90vh] overflow-y-auto text-white space-y-4 border border-[#1E2A45] shadow-2xl">
            <h2 className="text-lg font-semibold">MS SQL access подготовлен</h2>

            <div className="text-sm text-gray-300 leading-6">
              KazPAM проверил доступ и подготовил строку подключения для SQL-клиента.
            </div>

            <div className="rounded-lg bg-[#0E1A3A] border border-[#1E2A45] p-4 text-sm space-y-2">
              <div>Session ID: #{dbAccessResult.session_id}</div>
              <div>Target: #{dbAccessResult.target_id} · {dbAccessResult.target_name}</div>
              <div>Host: {dbAccessResult.target_host}:{dbAccessResult.target_port}</div>
              <div>User: {dbAccessResult.username || "—"}</div>
              <div>Break-glass: {dbAccessResult.break_glass ? "Да" : "Нет"}</div>
            </div>

            <div className="rounded-xl border border-[#1E2A45] bg-[#0B1221] p-4 font-mono text-sm text-[#3BE3FD] break-all">
              {dbAccessResult.connection_string_stub}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDbAccessResult(null)}
                className="px-3 py-2 text-gray-300"
              >
                Закрыть
              </button>

              <button
                onClick={async () => {
                  await copyText(dbAccessResult.connection_string_stub);
                  toast.success("MS SQL connection string скопирован");
                }}
                className="px-4 py-2 rounded bg-[#0052FF] text-white"
              >
                Скопировать строку
              </button>
            </div>
          </div>
        </div>
      )}

      {vncAccessResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-[#121A33] p-6 rounded-xl w-[620px] max-w-[95vw] max-h-[90vh] overflow-y-auto text-white space-y-4 border border-[#1E2A45] shadow-2xl">
            <h2 className="text-lg font-semibold">VNC access подготовлен</h2>

            <div className="text-sm text-gray-300 leading-6">
              KazPAM проверил доступ и подготовил host/port для VNC-клиента.
            </div>

            <div className="rounded-lg bg-[#0E1A3A] border border-[#1E2A45] p-4 text-sm space-y-2">
              <div>Session ID: #{vncAccessResult.session_id}</div>
              <div>Target: #{vncAccessResult.target_id} · {vncAccessResult.target_name}</div>
              <div>Target host: {vncAccessResult.target_host}:{vncAccessResult.target_port}</div>
              <div>Launch: {vncAccessResult.launch_host}:{vncAccessResult.launch_port}</div>
              <div>User: {vncAccessResult.username || "—"}</div>
              <div>Break-glass: {vncAccessResult.break_glass ? "Да" : "Нет"}</div>
            </div>

            <div className="rounded-xl border border-[#1E2A45] bg-[#0B1221] p-4 font-mono text-sm text-[#3BE3FD] break-all">
              {vncAccessResult.launch_host}:{vncAccessResult.launch_port}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setVncAccessResult(null)}
                className="px-3 py-2 text-gray-300"
              >
                Закрыть
              </button>

              <button
                onClick={async () => {
                  await copyText(`${vncAccessResult.launch_host}:${vncAccessResult.launch_port}`);
                  toast.success("VNC host:port скопирован");
                }}
                className="px-4 py-2 rounded bg-[#0052FF] text-white"
              >
                Скопировать host:port
              </button>
            </div>
          </div>
        </div>
      )}

      {startOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-[#121A33] p-6 rounded-xl w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto text-white space-y-4 border border-[#1E2A45] shadow-2xl">
            <h2 className="text-lg font-semibold">Запуск сессии</h2>

            <div className="space-y-1">
              <div className="text-sm text-gray-400">Протокол доступа</div>
              <select
                value={launchProtocol}
                onChange={(e) => setLaunchProtocol(e.target.value as LaunchProtocol)}
                className="w-full px-3 py-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-sm text-white"
                disabled={launchLoading}
              >
                <option value="ssh">SSH</option>
                <option value="rdp">RDP</option>
                <option value="https">HTTPS</option>
                <option value="mssql">MS SQL</option>
                <option value="vnc">VNC</option>
              </select>
            </div>

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
                disabled={targetsLoading || launchLoading}
              >
                <option value="">
                  {targetsLoading
                    ? "Загрузка систем..."
                    : protocolTargets.length === 0
                    ? `Нет доступных ${protocolLabel(launchProtocol)} targets`
                    : `Выберите ${protocolLabel(launchProtocol)} target`}
                </option>

                {protocolTargets.map((target) => (
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
                      {selectedTarget.username || "—"}
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

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStartOpen(false)}
                disabled={launchLoading}
              >
                Отмена
              </button>

              <button
                disabled={launchLoading || !selectedTarget}
                className="px-4 py-2 bg-[#0052FF] rounded disabled:bg-gray-600"
                onClick={handleLaunch}
              >
                {launchLoading ? "Запуск..." : "Запустить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}