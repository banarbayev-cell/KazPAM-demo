import { useState } from "react";
import ThreatCard from "../components/ThreatCard";

export default function SocDashboard() {
  const [openInvestigation, setOpenInvestigation] = useState(false);

  return (
    <div className="p-8 space-y-8">
      <ThreatCard
        level="high"
        incidents={[
          "root — вход с неизвестного IP",
          "operator01 — попытка повышения привилегий",
          "security — доступ к запрещённому разделу",
          "root — 14 подозрительных команд",
        ]}
        onInvestigate={() => setOpenInvestigation(true)}
      />

      {openInvestigation && (
        <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-5 text-gray-300">
          🔍 Расследование будет здесь (InvestigationModal — следующий шаг)
        </div>
      )}
    </div>
  );
}
