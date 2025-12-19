import { useEffect, useMemo, useState } from "react";
import ThreatCard from "../components/ThreatCard";
import InvestigationModal from "../components/modals/InvestigationModal";
import { fetchAuditLogs, AuditLog } from "../api/audit";
import { calculateRiskScore } from "../utils/riskScore";
import { createIncident, Incident } from "../utils/incident";
import {
  blockUser,
  isolateSession,
  exportSocCsv,
  exportSocSiemJson,
} from "../api/socActions";

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
      ["LOGIN", "DENY", "FAILED", "PRIVILEGE", "FORBIDDEN"].some(
        (k) => log.action?.toUpperCase().includes(k)
      )
    );
  }, [auditLogs]);

  // ============================
  // BUILD RECORD FOR MODAL
  // ============================
  const record = useMemo(() => {
    const first = suspiciousLogs[0];

    return {
      user: first?.user || "unknown",
      ip: first?.details?.ip || "unknown",
      location: first?.details?.location || "Unknown",
      device: first?.details?.device || "Unknown",
      events: suspiciousLogs.map(
        (e) =>
          `${new Date(e.created_at).toLocaleTimeString()} — ${e.action}`
      ),
    };
  }, [suspiciousLogs]);

  // ============================
  // RISK SCORE
  // ============================
  const risk = useMemo(
    () => calculateRiskScore(suspiciousLogs),
    [suspiciousLogs]
  );

  // ============================
  // OPEN INVESTIGATION
  // ============================
  const handleInvestigate = () => {
    if (!incident) {
      setIncident(createIncident());
    }
    setRbacError(null);
    setInvestigationOpen(true);
  };

  return (
    <div className="p-8 space-y-8">
      <ThreatCard
        level={
          risk.level === "CRITICAL" || risk.level === "HIGH"
            ? "high"
            : "medium"
        }
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

            setIncident((prev) =>
              prev
                ? {
                    ...prev,
                    status: "INVESTIGATING",
                    lastAction: "USER_BLOCKED",
                  }
                : prev
            );
          } catch {
            setRbacError({
              action: "BLOCK_USER",
              message: "Недостаточно прав для блокировки пользователя",
              requiredPermission: "soc_block_user",
            });
          }
        }}

        // ===== ISOLATE SESSION (RBAC SAFE) =====
        onIsolate={async () => {
          try {
            setRbacError(null);
            await isolateSession(record.user);

            setIncident((prev) =>
              prev
                ? {
                    ...prev,
                    status: "INVESTIGATING",
                    lastAction: "SESSION_ISOLATED",
                  }
                : prev
            );
          } catch {
            setRbacError({
              action: "ISOLATE_SESSION",
              message: "Недостаточно прав для изоляции сессии",
              requiredPermission: "soc_isolate_session",
            });
          }
        }}

        // ===== EXPORT SOC =====
        onExport={async () => {
          try {
            setRbacError(null);
            await exportSocCsv();
            await exportSocSiemJson();

            setIncident((prev) =>
              prev ? { ...prev, lastAction: "EXPORTED" } : prev
            );
          } catch {
            /* экспорт не критичен */
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
              У вашей текущей роли отсутствует необходимое разрешение
              для выполнения данного действия
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
              и запросите назначение разрешения
              <span className="ml-1 text-blue-400 font-mono">
                {rbacError.requiredPermission}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-400">
          Загрузка audit-данных…
        </div>
      )}
    </div>
  );
}
