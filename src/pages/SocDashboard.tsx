import { useEffect, useMemo, useState } from "react";
import ThreatCard from "../components/ThreatCard";
import InvestigationModal from "../components/modals/InvestigationModal";
import { fetchAuditLogs, AuditLog } from "../api/audit";
import { calculateRiskScore } from "../utils/riskScore";
import { createIncident, Incident } from "../utils/incident";
import { blockUser, isolateSession } from "../api/socActions";


export default function SocDashboard() {
  const [investigationOpen, setInvestigationOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  // 🆕 INCIDENT STATE
  const [incident, setIncident] = useState<Incident | null>(null);

  // ============================
  // LOAD AUDIT LOGS
  // ============================
  useEffect(() => {
    setLoading(true);

    fetchAuditLogs()
      .then((data) => {
        setAuditLogs(data);
      })
      .catch((err) => {
        console.error("Audit load error:", err);
      })
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
    setInvestigationOpen(true);
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
  onBlock={async () => {
    await blockUser(record.user);
    setIncident((prev) =>
      prev ? { ...prev, status: "INVESTIGATING" } : prev
    );
  }}
  onIsolate={async () => {
    await isolateSession(record.user);
    setIncident((prev) =>
      prev ? { ...prev, status: "INVESTIGATING" } : prev
    );
  }}
  onExport={() => {
    console.log("📤 EXPORT INCIDENT", incident?.id);
  }}
/>


      {loading && (
        <div className="text-sm text-gray-400">
          Загрузка audit-данных…
        </div>
      )}

    </div>
  );
}
