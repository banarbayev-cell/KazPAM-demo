// C:\Users\user\Documents\KazPAM-dashboard\src\pages\SocDashboard.tsx

import { useEffect, useMemo, useRef, useState } from "react";

import ThreatCard from "../components/ThreatCard";
import InvestigationModal from "../components/modals/InvestigationModal";
import { fetchAuditLogs, AuditLog } from "../api/audit";
import { calculateRiskScore, type RiskLevel } from "../utils/riskScore";
import { Incident } from "../utils/incident";
import { sanitizeText } from "../utils/sanitizeText";
import { API_URL } from "../api/config";
import SourceTooltip from "../components/ui/SourceTooltip";
import { buildEffectivePermissions } from "../utils/effectivePermissions";
import { useAuth } from "../store/auth";
import { parseUserAgent } from "../utils/parseUserAgent";
import { fetchSocSummary } from "../api/socSummary";
import type { SocSummaryResponse } from "../api/socSummary";
import { fetchSocCommands } from "../api/socCommands";
import type { SocCommand } from "../api/socCommands";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatKzDateTime } from "../utils/time";

import {
  blockUser,
  isolateSession,
  exportSocSiemJson,
} from "../api/socActions";

function mapBackendIncidentToUi(b: any): Incident {
  return {
    id: String(b.incident_id ?? b.id ?? crypto.randomUUID()),
    backendId: b.incident_id ?? b.id,
    status: (b.status ?? "OPEN") as any,
    createdAt: String(b.created_at ?? ""),
    closedAt: b.closed_at ? String(b.closed_at) : undefined,
    lastAction: null,
    actions: [],
    comments: [],
  };
}

function normalizeRiskLevel(level?: string): RiskLevel {
  const v = (level || "").toUpperCase();

  if (v === "CRITICAL") return "CRITICAL";
  if (v === "HIGH") return "HIGH";
  if (v === "MEDIUM") return "MEDIUM";
  return "LOW";
}

/**
 * SAFE DATE PARSER
 * Усиление: корректно обрабатывает формат KazPAM
 * "DD.MM.YYYY HH:MM:SS"
 * Ничего не ломает — при ошибке просто возвращает исходную строку
 */
function safeTime(value?: string) {
  return formatKzDateTime(value, {
    seconds: false,
    naiveInput: "utc",
  });
}



type RbacError =
  | {
      action: "BLOCK_USER" | "ISOLATE_SESSION";
      message: string;
      requiredPermission: string;
    }
  | null;

type SessionCommand = {
  type: "command";
  time: string;
  command: string;
  recording_id: number;
  session_id?: number;
  user?: string;
  system?: string;
  severity?: "low" | "medium" | "high";
  risk_score?: number;
  risk_reason?: string;
};

function toSessionCommand(c: SocCommand): SessionCommand {
  return {
    type: "command",
    time: c.time,
    command: c.command,
    recording_id: c.recording_id,
    session_id: c.session_id,
    user: c.user,
    system: c.system,
    severity: c.severity,
    risk_score: c.risk_score,
    risk_reason: c.risk_reason,
  };
}

const SOC_INCIDENT_STORAGE_KEY = "kazpam_soc_incident_id";
const SOC_INCIDENT_SESSION_KEY = "kazpam_soc_incident_restored";

function getSeverityBadgeClass(severity?: "low" | "medium" | "high") {
  if (severity === "high") {
    return "bg-red-500/20 text-red-300 border border-red-500/30";
  }

  if (severity === "medium") {
    return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
  }

  if (severity === "low") {
    return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  }

  return "bg-[#0E1A3A] text-gray-400 border border-[#24314F]";
}

function getSeverityLabel(severity?: "low" | "medium" | "high") {
  if (severity === "high") return "HIGH";
  if (severity === "medium") return "MEDIUM";
  if (severity === "low") return "LOW";
  return "—";
}


export default function SocDashboard() {
  // 🔐 Каноничный источник токена + ролей. ВАЖНО: один раз, в самом верху.

  const navigate = useNavigate();
  const auth = useAuth();

  const token = auth.token;
  const roles = auth.user?.roles ?? [];
  const wsRef = useRef<WebSocket | null>(null);
  const wsClosingRef = useRef(false);
  const initialLoadedRef = useRef(false);
  const wsReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔎 Investigation query
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q");

  const [investigationOpen, setInvestigationOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  // INCIDENT STATE
  const [incident, setIncident] = useState<Incident | null>(null);
  const [summary, setSummary] = useState<SocSummaryResponse | null>(null);

  
  
  // ============================
  // LOAD INITIAL COMMANDS
  // ============================

useEffect(() => {
  if (!token) return;
  if (initialLoadedRef.current) return;

  initialLoadedRef.current = true;

  fetchSocCommands()
    .then((data: SocCommand[]) => {
      const items = Array.isArray(data) ? data : [];
      const mapped = items.map(toSessionCommand);

      console.log("SOC initial commands loaded:", mapped.length, mapped);
      setLiveCommands(mapped.slice(0, 50));
    })
    .catch((err) => {
      console.error("SOC commands load error:", err);
      setLiveCommands([]);
    });

  return () => {
    initialLoadedRef.current = false;
  };
}, [token]);

  // ============================
  // REALTIME SESSION COMMANDS
  // ============================

  const [liveCommands, setLiveCommands] = useState<SessionCommand[]>([]);

  const filteredIncidents = useMemo(() => {
  if (!summary?.incident) return [];

  const list = [summary.incident];

  if (!q) return list;

  const s = q.toLowerCase();

  return list.filter((i: any) =>
    (i.ip || "").toLowerCase().includes(s) ||
    (i.user || "").toLowerCase().includes(s) ||
    (i.system || "").toLowerCase().includes(s) ||
    (i.correlation_id || "").toLowerCase().includes(s)
  );
}, [summary, q]);

  // RBAC ERROR (STRUCTURED)
  const [rbacError, setRbacError] = useState<RbacError>(null);

  // (опционально) токен-гейт без побочных эффектов
  // раньше он у тебя был, но пустой — оставляем безопасно как no-op
  useEffect(() => {
    if (!token) return;
  }, [token]);

  // ============================
  // LOAD AUDIT LOGS
  // ============================
  useEffect(() => {
    setLoading(true);

    fetchAuditLogs()
      .then(setAuditLogs)
      .catch((err) => console.error("Audit load error:", err))
      .finally(() => setLoading(false));
  }, []);

  // ============================
  // LOAD SOC SUMMARY (SOURCE OF TRUTH)
  // ============================
  useEffect(() => {
    if (!token) return;

    fetchSocSummary()
      .then(setSummary)
      .catch((e) => console.error("SOC summary load error:", e));
  }, [token]);

  // ============================
  // SOC LIVE COMMAND STREAM
  // ============================

  useEffect(() => {
  if (!token) return;

  const wsUrl = `${API_URL.replace(/^http/, "ws")}/soc/ws/commands`;
  let mounted = true;

  const connect = () => {
    if (!mounted) return;

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    wsClosingRef.current = false;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mounted || wsClosingRef.current) return;
      console.log("SOC command stream connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "command") {
          const next: SessionCommand = {
            type: "command",
            time: data.time,
            command: data.command,
            recording_id: data.recording_id,
            session_id: data.session_id,
            user: data.user,
            system: data.system,
            severity: data.severity,
            risk_score: data.risk_score,
            risk_reason: data.risk_reason,
          };

          setLiveCommands((prev) => [next, ...prev].slice(0, 100));
        }
      } catch (err) {
        console.error("SOC WS parse error:", err);
      }
    };

    ws.onerror = (event) => {
      if (!mounted || wsClosingRef.current) return;
      console.error("SOC WS error:", event);
    };

    ws.onclose = () => {
      if (!mounted || wsClosingRef.current) return;

      console.log("SOC command stream closed");

      wsReconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  };

  connect();

  return () => {
    mounted = false;
    wsClosingRef.current = true;

    if (wsReconnectTimerRef.current) {
      clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "SocDashboard unmount");
      wsRef.current = null;
    }
  };
}, [token]);

  // ============================
  // RESTORE INCIDENT AFTER RELOAD (NO REGRESSIONS)
  // ============================
  useEffect(() => {
    // без токена не лезем в API (иначе 401)
    if (!token) return;

    // если уже есть инцидент в state — ничего не делаем
    if (incident?.backendId || (incident as any)?.id) return;

    const savedId = localStorage.getItem(SOC_INCIDENT_STORAGE_KEY);
    if (!savedId) return;

    const authHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    (async () => {
      try {
        const r = await fetch(`${API_URL}/incidents/${savedId}`, {
          headers: authHeaders,
        });

        if (!r.ok) {
          // если инцидент недоступен/удалён — очищаем якорь
          localStorage.removeItem(SOC_INCIDENT_STORAGE_KEY);
          return;
        }

        const data = await r.json();

        setIncident(mapBackendIncidentToUi(data));

// 🔒 UX-GATE: автооткрываем ТОЛЬКО 1 РАЗ за сессию
const alreadyRestoredThisSession = sessionStorage.getItem(
  SOC_INCIDENT_SESSION_KEY
);

if (!alreadyRestoredThisSession) {
  setInvestigationOpen(true);
  sessionStorage.setItem(SOC_INCIDENT_SESSION_KEY, "1");
}
      } catch (e) {
        // сеть/ошибка — не ломаем страницу, просто очищаем якорь
        localStorage.removeItem(SOC_INCIDENT_STORAGE_KEY);
      }
    })();
    // ВАЖНО: зависимость только token, как у тебя было
    // incident намеренно НЕ добавляем, чтобы не было лишних запросов
  }, [token]);

  // ============================
  // SOC FILTER (MVP)
  // ============================
  const suspiciousLogs = useMemo(() => {
    return auditLogs.filter((log) =>
      ["LOGIN", "DENY", "FAILED", "PRIVILEGE", "FORBIDDEN"].some((k) =>
        log.action?.toUpperCase().includes(k)
      )
    );
  }, [auditLogs]);

  // ============================
  // BUILD RECORD FOR MODAL
  // ============================
  const record = useMemo(() => {
    const firstWithIp = suspiciousLogs.find((log) => {
      try {
        const d =
          typeof log.details === "string" ? JSON.parse(log.details) : log.details;
        return d?.source_ip;
      } catch {
        return false;
      }
    });

    const first = firstWithIp || suspiciousLogs[0];

    const rawDetails = first?.details;
    let details: any = null;

    try {
      details = typeof rawDetails === "string" ? JSON.parse(rawDetails) : rawDetails;
    } catch {
      details = null;
    }

    return {
      user: first?.user || "unknown",
      ip: details?.source_ip || details?.source?.ip || "unknown",
      location: details?.location || "Unknown",
      device: parseUserAgent(details?.device || details?.source?.user_agent),

      // ВАЖНО: используем timestamp (как вы фиксировали)
      events: suspiciousLogs.map((e) =>
        sanitizeText(`${safeTime(e.timestamp) || e.timestamp} — ${e.action}`)
      ),
    };
  }, [suspiciousLogs]);

  // ============================
  // RISK SCORE
  // ============================
  const risk = useMemo(() => calculateRiskScore(suspiciousLogs), [suspiciousLogs]);
  
  // ============================
  // DISPLAYED CREATED AT (backend first)
  // ============================
  const displayedCreatedAt = useMemo(() => {
    if (summary?.incident?.created_at) {
     return safeTime(summary.incident.created_at);
  }
     return "";
  }, [summary]);

  // ============================
// DISPLAYED RISK (backend first)
// ============================
  const displayedRisk = useMemo(() => {
  if (summary?.has_incident && summary.incident) {
    return {
      score: summary.incident.risk_score,
      level: normalizeRiskLevel(summary.incident.severity),
    };
  }
  return risk;
}, [summary, risk]);

  // ============================
  // SOC EFFECTIVE PERMISSIONS (for tooltips / explainability)
  // ============================
  const socEffectivePermissions = useMemo(() => {
    if (!roles.length) return [];
     return buildEffectivePermissions({ roles });
  }, [roles]);

  const deniedSocPermission = useMemo(() => {
    if (!rbacError?.requiredPermission) return null;

    return (
      socEffectivePermissions.find((p) => p.code === rbacError.requiredPermission) || {
        code: rbacError.requiredPermission,
        granted: false,
        roles: [],
        policies: [],
      }
    );
  }, [rbacError, socEffectivePermissions]);

  // ============================
  // OPEN INVESTIGATION
  // ============================


  const handleInvestigate = async () => {
    setRbacError(null);

    if (summary?.incident) {
  setIncident(mapBackendIncidentToUi(summary.incident));
  setInvestigationOpen(true);
  return;
}

    // если токена нет — не пытаемся ходить в API (иначе 401)
    if (!token) {
      console.error("SOC investigate: missing token (login required)");
      return;
    }

    // если уже есть сохранённый инцидент — не создаём новый
    const savedId = localStorage.getItem(SOC_INCIDENT_STORAGE_KEY);
    if (savedId) {
      setInvestigationOpen(true);
      return;
    }

    const authHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    try {
      // 1️⃣ пробуем получить активный incident из backend
      const res = await fetch(
        `${API_URL}/incidents/active?user=${encodeURIComponent(record.user)}`,
        { headers: authHeaders }
      );

      if (!res.ok) {
        throw new Error("Failed to load active incident");
      }

      const existing = await res.json();

      if (existing) {
        // 2️⃣ есть активный — используем его
        setIncident({
          ...existing,
          backendId: existing.id,
        });
        // ✅ сохраняем якорь дела
        localStorage.setItem(SOC_INCIDENT_STORAGE_KEY, String(existing.id));
      } else {
        // 3️⃣ нет активного — создаём в backend
        const createRes = await fetch(`${API_URL}/incidents/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            user: record.user,
            system: "KazPAM",
            ip: record.ip,
            severity: risk.level,
            risk_score: risk.score,
            summary: "SOC detected suspicious activity",
          }),
        });

        if (!createRes.ok) {
          throw new Error("Failed to create incident");
        }

        const created = await createRes.json();

        setIncident({
          ...created,
          backendId: created.id,
        });

        // ✅ сохраняем якорь дела (created доступен только здесь)
        localStorage.setItem(SOC_INCIDENT_STORAGE_KEY, String(created.id));
      }

      setInvestigationOpen(true);
    } catch (e) {
      console.error("SOC investigate error:", e);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <ThreatCard
        level={
          displayedRisk.level === "CRITICAL" || displayedRisk.level === "HIGH"
            ? "high"
            : "medium"
}
        incidents={record.events.slice(0, 4)}
        createdAt={displayedCreatedAt}   // ✅ ВОТ ЭТО ДОБАВЬ
        investigationQuery={summary?.incident?.ip}
        onInvestigate={(q) => {
          if (q && window.location.pathname !== "/soc") {
            navigate(`/soc?q=${encodeURIComponent(q)}`);
            return;
          }

          handleInvestigate();

        }} 
/> 

      <InvestigationModal
        isOpen={investigationOpen}
        onClose={() => setInvestigationOpen(false)}
        record={record}
        risk={displayedRisk}
        incident={incident}

        // ===== BLOCK USER (RBAC SAFE) =====
        onBlock={async () => {
          try {
            setRbacError(null);
            await blockUser(record.user);

            // усиливаем: добавляем action-entry в incident (frontend-only state)
            setIncident((prev) =>
              prev
                ? {
                    ...prev,
                    status: "INVESTIGATING",
                    lastAction: "USER_BLOCKED",
                    actions: [
                      ...(prev.actions || []),
                      {
                        type: "SOC_BLOCK_USER",
                        actor: "soc",
                        timestamp: new Date().toISOString(),
                        result: "SUCCESS",
                      },
                    ],
                  }
                : prev
            );
          } catch {
            setRbacError({
              action: "BLOCK_USER",
              message: "Недостаточно прав для блокировки пользователя",
              requiredPermission: "soc_block_user",
            });

            // усиливаем: фиксируем FAILED в истории, но не ломаем поток
            setIncident((prev) =>
              prev
                ? {
                    ...prev,
                    actions: [
                      ...(prev.actions || []),
                      {
                        type: "SOC_BLOCK_USER",
                        actor: "soc",
                        timestamp: new Date().toISOString(),
                        result: "FAILED",
                      },
                    ],
                  }
                : prev
            );
          }
        }}

        // ===== ISOLATE SESSION (RBAC SAFE) =====
        onIsolate={async () => {
          try {
            setRbacError(null);
            await isolateSession(record.user);

            // ВАЖНО: правильный type (SOC_ISOLATE_SESSION)
            setIncident((prev) =>
              prev
                ? {
                    ...prev,
                    status: "INVESTIGATING",
                    lastAction: "SESSION_ISOLATED",
                    actions: [
                      ...(prev.actions || []),
                      {
                        type: "SOC_ISOLATE_SESSION",
                        actor: "soc",
                        timestamp: new Date().toISOString(),
                        result: "SUCCESS",
                      },
                    ],
                  }
                : prev
            );
          } catch {
            setRbacError({
              action: "ISOLATE_SESSION",
              message: "Недостаточно прав для изоляции сессии",
              requiredPermission: "soc_isolate_session",
            });

            setIncident((prev) =>
              prev
                ? {
                    ...prev,
                    actions: [
                      ...(prev.actions || []),
                      {
                        type: "SOC_ISOLATE_SESSION",
                        actor: "soc",
                        timestamp: new Date().toISOString(),
                        result: "FAILED",
                      },
                    ],
                  }
                : prev
            );
          }
        }}

        // ===== EXPORT SOC =====
        onExport={async () => {
          try {
            setRbacError(null);
            await exportSocSiemJson();

            setIncident((prev) =>
              prev
                ? {
                    ...prev,
                    lastAction: "EXPORTED",
                    actions: [
                      ...(prev.actions || []),
                      {
                        type: "SOC_EXPORT",
                        actor: "soc",
                        timestamp: new Date().toISOString(),
                        result: "SUCCESS",
                      },
                    ],
                  }
                : prev
            );
          } catch {
            // экспорт не критичен, но можно оставить след
            setIncident((prev) =>
              prev
                ? {
                    ...prev,
                    actions: [
                      ...(prev.actions || []),
                      {
                        type: "SOC_EXPORT",
                        actor: "soc",
                        timestamp: new Date().toISOString(),
                        result: "FAILED",
                      },
                    ],
                  }
                : prev
            );
          }
        }}
      />

      {/* ===== RBAC NOTICE (TABLE, PRODUCT-LEVEL) ===== */}
      {rbacError && (
        <div className="max-w-3xl border border-[#1E2A45] rounded-xl bg-[#121A33] text-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E2A45] text-yellow-400 font-semibold">
            ⚠ Ограничение прав
          </div>

          <div className="grid grid-cols-3">
            <div className="px-4 py-3 text-gray-400 border-t border-[#1E2A45]">
              Действие
            </div>
            <div className="px-4 py-3 col-span-2 border-t border-[#1E2A45] text-white">
              {rbacError.action === "ISOLATE_SESSION"
                ? "Изоляция сессии"
                : "Блокировка пользователя"}
            </div>

            <div className="px-4 py-3 text-gray-400 border-t border-[#1E2A45]">
              Статус
            </div>
            <div className="px-4 py-3 col-span-2 border-t border-[#1E2A45] text-red-300">
              {rbacError.message}
            </div>

            <div className="px-4 py-3 text-gray-400 border-t border-[#1E2A45]">
              Что это значит
            </div>
            <div className="px-4 py-3 col-span-2 border-t border-[#1E2A45] text-gray-300">
              У вашей текущей роли отсутствует необходимое разрешение для выполнения
              данного действия
            </div>

            <div className="px-4 py-3 text-gray-400 border-t border-[#1E2A45]">
              Что делать
            </div>
            <div className="px-4 py-3 col-span-2 border-t border-[#1E2A45] text-gray-300 leading-relaxed">
              Обратитесь к администратору безопасности
              <span className="ml-1 text-white font-semibold">
                (роль: Super Admin или SOC Admin)
              </span>
              <br />
              и запросите назначение разрешения{" "}
              <span className="ml-1">
                {deniedSocPermission && (
                  <SourceTooltip
                    permission={deniedSocPermission}
                    deniedReason={`Permission «${rbacError.requiredPermission}» отсутствует во всех ролях текущего пользователя.`}
                  />
                )}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* LIVE SESSION COMMANDS */}
      <div className="mt-8 bg-[#121A33] border border-[#1E2A45] rounded-xl p-4">
        <div className="text-sm text-gray-400 mb-2">Live Session Commands</div>

        {liveCommands.length === 0 && (
          <div className="text-xs text-gray-500">No commands yet</div>
      )}

        {liveCommands.map((c, i) => (
          <div 
            key={`${c.recording_id}-${c.time}-${i}`}
            className="text-xs font-mono text-gray-200 flex flex-wrap items-center gap-2 mb-1"
          >
            <span className="text-gray-400">[{safeTime(c.time)}]</span>

            <span
              title={c.risk_reason || ""}
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${getSeverityBadgeClass(
                 c.severity
              )}`}  
            >
              {getSeverityLabel(c.severity)}
              {typeof c.risk_score === "number" ? ` · ${c.risk_score}` : ""}
            </span>
          
            <span className="text-green-400 break-all">{c.command}</span>
          </div>  
      ))}
</div>

      {loading && <div className="text-sm text-gray-400">Загрузка audit-данных…</div>}
    </div>
  );
}
