// C:\Users\user\Documents\KazPAM-dashboard\src\pages\SocDashboard.tsx

import { useEffect, useMemo, useState } from "react";
import ThreatCard from "../components/ThreatCard";
import InvestigationModal from "../components/modals/InvestigationModal";
import { fetchAuditLogs, AuditLog } from "../api/audit";
import { calculateRiskScore } from "../utils/riskScore";
import { Incident } from "../utils/incident";
import { sanitizeText } from "../utils/sanitizeText";
import { API_URL } from "../api/config";

import { useAuth } from "../store/auth"; // ✅ усиление: каноничный источник токена

import {
  blockUser,
  isolateSession,
  exportSocCsv,
  exportSocSiemJson,
} from "../api/socActions";

/**
 * SAFE DATE PARSER
 * Усиление: корректно обрабатывает формат KazPAM
 * "DD.MM.YYYY HH:MM:SS"
 * Ничего не ломает — при ошибке просто возвращает исходную строку
 */
function safeTime(value?: string) {
  // если вообще нет значения — не придумываем "сегодня"
  if (!value || value.trim() === "") {
    return "";
  }

  // формат KazPAM: "DD.MM.YYYY HH:MM:SS" или "DD.MM.YYYY HH:MM"
  if (value.includes(" ")) {
    const [datePart, timePart] = value.split(" ");
    const [day, month, year] = datePart.split(".").map(Number);

    const timeParts = timePart.split(":").map(Number);
    const hour = timeParts[0];
    const minute = timeParts[1] ?? 0;

    if (day && month && year && hour !== undefined && minute !== undefined) {
      const d = new Date(year, month - 1, day, hour, minute);

      if (!isNaN(d.getTime())) {
        const hh = hour.toString().padStart(2, "0");
        const mm = minute.toString().padStart(2, "0");
        return `${datePart} ${hh}:${mm}`;
      }
    }
  }

  // формат: "DD.MM.YYYY" (без времени)
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    return `${value} 00:00`;
  }

  // fallback — ничего не ломаем
  return value;
}

type RbacError =
  | {
      action: "BLOCK_USER" | "ISOLATE_SESSION";
      message: string;
      requiredPermission: string;
    }
  | null;

export default function SocDashboard() {
  const [investigationOpen, setInvestigationOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  // INCIDENT STATE
  const [incident, setIncident] = useState<Incident | null>(null);

  // RBAC ERROR (STRUCTURED)
  const [rbacError, setRbacError] = useState<RbacError>(null);

  // ✅ усиление: берём токен из каноничного auth store (Zustand)
  const token = useAuth((s) => s.token);

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
        const d = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
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
      ip: details?.source_ip || "unknown",
      location: details?.location || "Unknown",
      device: details?.device || "Unknown",

      // ВАЖНО: используем timestamp (как вы зафиксировали)
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
  // OPEN INVESTIGATION
  // ============================
  const handleInvestigate = async () => {
    setRbacError(null);

    // ✅ усиление: если токена нет — не пытаемся ходить в API (иначе 401)
    if (!token) {
      console.error("SOC investigate: missing token (login required)");
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
      }

      setInvestigationOpen(true);
    } catch (e) {
      console.error("SOC investigate error:", e);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <ThreatCard
        level={risk.level === "CRITICAL" || risk.level === "HIGH" ? "high" : "medium"}
        incidents={record.events.slice(0, 4)}
        onInvestigate={handleInvestigate}
      />

      <InvestigationModal
        isOpen={investigationOpen}
        onClose={() => setInvestigationOpen(false)}
        record={record}
        risk={risk}
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
            await exportSocCsv();
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
              {rbacError.action === "ISOLATE_SESSION" ? "Изоляция сессии" : "Блокировка пользователя"}
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
              У вашей текущей роли отсутствует необходимое разрешение для выполнения данного действия
            </div>

            <div className="px-4 py-3 text-gray-400 border-t border-[#1E2A45]">
              Что делать
            </div>
            <div className="px-4 py-3 col-span-2 border-t border-[#1E2A45] text-gray-300 leading-relaxed">
              Обратитесь к администратору безопасности
              <span className="ml-1 text-white font-semibold">(роль: Super Admin или SOC Admin)</span>
              <br />
              и запросите назначение разрешения
              <span className="ml-1 text-blue-400 font-mono">{rbacError.requiredPermission}</span>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-gray-400">Загрузка audit-данных…</div>}
    </div>
  );
}
