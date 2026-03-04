// src/components/ThreatCard.tsx

interface ThreatCardProps {
  level: string;
  incidents: string[];
  onInvestigate: (query?: string) => void;
  createdAt?: string;
  investigationQuery?: string;
}

export default function ThreatCard({
  level,
  incidents,
  onInvestigate,
  createdAt,
  investigationQuery,
}: ThreatCardProps) {
  return (
    <div className="alert-pulse bg-[#121A33] border border-red-600 rounded-xl shadow-xl p-6">
      {/* TITLE */}
      <h2 className="text-xl font-bold text-red-400 mb-2">
        Высокий уровень угрозы
      </h2>

      {/* INCIDENT COUNT */}
      <p className="text-[var(--text-secondary)] mb-4">
        {incidents.length} подозрительных активности за сегодня
      </p>

      {/* INCIDENT LIST */}
      <ul className="list-disc ml-4 space-y-1 text-white">
        {incidents.map((i, index) => (
          <li key={index}>{i}</li>
        ))}
      </ul>

      {/* CREATED AT */}
      <div className="mt-4 text-xs text-gray-400">
        Created: {createdAt || "—"}
      </div>

      {/* INVESTIGATION CONTEXT */}
      {investigationQuery && (
        <div className="mt-1 text-xs text-blue-400">
          Investigate context: {investigationQuery}
        </div>
      )}

      {/* INVESTIGATE BUTTON */}
      <button
        onClick={() => onInvestigate(investigationQuery)}
        className="mt-5 px-4 py-2 rounded-lg bg-red-600/30 hover:bg-red-600/60 border border-red-500 text-red-300 font-semibold transition-all"
      >
        Открыть расследование
      </button>
    </div>
  );
}