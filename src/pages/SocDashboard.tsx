import { useState } from "react";
import ThreatCard from "../components/ThreatCard";
import InvestigationModal from "../components/modals/InvestigationModal";

export default function SocDashboard() {
  const [investigationOpen, setInvestigationOpen] = useState(false);

  return (
    <div className="p-8 space-y-8">

      {/* SOC ALERT CARD */}
      <ThreatCard
        level="high"
        incidents={[
          "root — вход с неизвестного IP",
          "operator01 — попытка повышения привилегий",
          "security — доступ к запрещённому разделу",
          "root — 14 подозрительных команд",
        ]}
        onInvestigate={() => setInvestigationOpen(true)}
      />

      {/* INVESTIGATION MODAL */}
      <InvestigationModal
        isOpen={investigationOpen}
        onClose={() => setInvestigationOpen(false)}
        record={{
          user: "root",
          ip: "185.xxx.xxx.xxx",
          location: "Unknown",
          device: "Linux Server",
          events: [
            "Вход с неизвестного IP",
            "14 подозрительных команд",
            "Попытка обхода политики доступа",
            "Аномальный рост активности команд",
          ],
        }}
        onBlock={() => {
          console.log("🚫 BLOCK USER root");
          setInvestigationOpen(false);
        }}
        onIsolate={() => {
          console.log("⚡ ISOLATE SESSION");
        }}
        onExport={() => {
          console.log("📤 EXPORT INCIDENT");
        }}
      />

    </div>
  );
}
