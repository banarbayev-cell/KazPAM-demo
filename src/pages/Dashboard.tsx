import StatCard from "../components/StatCard";
import ActiveSessionsChart from "../components/charts/ActiveSessionsChart";
import AuditTable from "../components/AuditTable";
import ThreatCard from "../components/ThreatCard";
import InvestigationModal from "../components/modals/InvestigationModal";

import { useEffect, useState } from "react";
import { Users, Shield, Activity, ScrollText } from "lucide-react";

export default function Dashboard() {
  const [users, setUsers] = useState(127);
  const [sessions, setSessions] = useState(6);
  const [policies, setPolicies] = useState(14);
  const [audit, setAudit] = useState(842);

  const [openInvestigation, setOpenInvestigation] = useState(false);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions((prev) => Math.max(prev + (Math.random() > 0.5 ? 1 : -1), 0));
      setAudit((prev) => prev + Math.floor(Math.random() * 4));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-8">
      
      {/* THREAT CARD */}
      <ThreatCard
        level="high"
        incidents={[
          "root — вход с неизвестного IP",
          "operator01 — попытка повышения привилегий",
          "security — доступ к запрещенному разделу",
          "root — 14 подозрительных команд",
        ]}
        onInvestigate={() => setOpenInvestigation(true)}
      />

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Пользователи" value={users} icon={<Users size={28} />} />
        <StatCard title="Активные сессии" value={sessions} icon={<Activity size={28} />} />
        <StatCard title="Политики доступа" value={policies} icon={<Shield size={28} />} />
        <StatCard title="События аудита (24ч)" value={audit} icon={<ScrollText size={28} />} />
      </div>

      {/* CHART */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-4 text-[var(--text-secondary)]">
          Активность пользователей за последние 24 часа
        </h2>
        <ActiveSessionsChart />
      </div>

      {/* AUDIT TABLE */}
      <AuditTable />

      {/* INVESTIGATION MODAL */}
      <InvestigationModal
        open={openInvestigation}
        onClose={() => setOpenInvestigation(false)}
        ip="185.22.91.14"
        location="Алматы, КЗ"
        device="Unknown Linux Host"
        events={[
          "19:27 — sudo команда выполнена",
          "19:26 — сканирование файловой системы",
          "19:25 — попытка повышения привилегий",
          "19:24 — вход с неизвестного IP",
        ]}
        onBlockUser={() => console.log("Пользователь заблокирован")}
        onExport={() => console.log("Экспорт Excel")}
      />
    </div>
  );
}
