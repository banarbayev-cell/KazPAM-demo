import { useState } from "react";
import {
  X,
  Ban,
  ShieldAlert,
  FileSpreadsheet,
  PlugZap,
} from "lucide-react";
import CommandActivityChart from "../charts/CommandActivityChart";
import { RiskLevel } from "../../utils/riskScore";
import { Incident } from "../../utils/incident";

interface InvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;

  record: {
    user: string;
    ip: string;
    location: string;
    device: string;
    events: string[];
  };

  risk: {
    score: number;
    level: RiskLevel;
  };

  incident: Incident | null;

  onBlock: () => Promise<void> | void;
  onIsolate: () => Promise<void> | void;
  onExport: () => void;
}

export default function InvestigationModal({
  isOpen,
  onClose,
  record,
  risk,
  incident,
  onBlock,
  onIsolate,
  onExport,
}: InvestigationModalProps) {
  const [actionLoading, setActionLoading] = useState<
    null | "block" | "isolate"
  >(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-[#121A33] rounded-2xl w-full max-w-3xl p-6 shadow-2xl border border-[var(--border)] animate-fadeIn">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-red-400 flex items-center gap-2">
            <ShieldAlert size={26} />
            Угроза безопасности
          </h2>

          <button onClick={onClose} className="hover:text-red-400 transition">
            <X size={28} />
          </button>
        </div>

        {/* RISK SCORE */}
        <div className="mb-5">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Risk Score</span>
            <span className="font-semibold text-white">
              {risk.score} / 100 ({risk.level})
            </span>
          </div>

          <div className="w-full h-3 bg-[#0E1A3A] rounded-full overflow-hidden border border-[var(--border)]">
            <div
              className={`h-full transition-all ${
                risk.level === "CRITICAL"
                  ? "bg-red-600"
                  : risk.level === "HIGH"
                  ? "bg-orange-500"
                  : risk.level === "MEDIUM"
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${risk.score}%` }}
            />
          </div>
        </div>

        {/* INCIDENT STATUS */}
        {incident && (
          <div className="mb-5 bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-3">
            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-300">
                Incident ID:
                <span className="ml-2 font-semibold text-white">
                  {incident.id}
                </span>
              </div>

              {/* STATUS + ACTION BADGES */}
              <div className="flex gap-2 items-center">
                <span className="px-2 py-1 rounded bg-gray-700 text-gray-200 font-semibold">
                  {incident.status}
                </span>

                {incident.lastAction && (
                  <span
                    className={`px-2 py-1 rounded font-semibold ${
                      incident.lastAction === "USER_BLOCKED"
                        ? "bg-red-600 text-white"
                        : incident.lastAction === "SESSION_ISOLATED"
                        ? "bg-blue-600 text-white"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    {incident.lastAction}
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-400 mt-1">
              Created: {new Date(incident.createdAt).toLocaleString()}
            </div>
          </div>
        )}

        {/* TARGET */}
        <div className="space-y-1 text-sm text-gray-300 mb-4">
          <p><strong className="text-white">Пользователь:</strong> {record.user}</p>
          <p><strong className="text-white">IP:</strong> {record.ip}</p>
          <p><strong className="text-white">Локация:</strong> {record.location}</p>
          <p><strong className="text-white">Устройство:</strong> {record.device}</p>
        </div>

        {/* EVENTS */}
        <div className="bg-[#0E1A3A] border border-[var(--border)] p-4 rounded-lg mb-5">
          <h3 className="text-lg font-semibold text-white mb-2">
            Таймлайн событий
          </h3>
          <ul className="space-y-1 text-sm">
            {record.events.map((e, i) => (
              <li key={i} className="text-gray-400">• {e}</li>
            ))}
          </ul>
        </div>

        {/* CHART */}
        <div className="bg-[#0E1A3A] border border-[var(--border)] p-4 rounded-lg mb-5">
          <h3 className="text-lg font-semibold text-white mb-3">
            Активность команд
          </h3>
          <CommandActivityChart />
        </div>

        {/* ACTIONS */}
        <div className="flex justify-between gap-4">
          <button
            disabled={actionLoading === "isolate"}
            onClick={async () => {
              setActionLoading("isolate");
              await onIsolate();
              setActionLoading(null);
            }}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold flex gap-2"
          >
            <PlugZap size={18} /> Изолировать сессию
          </button>

          <button
            disabled={actionLoading === "block"}
            onClick={async () => {
              setActionLoading("block");
              await onBlock();
              setActionLoading(null);
            }}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold flex gap-2"
          >
            <Ban size={18} /> Заблокировать пользователя
          </button>

          <button
            onClick={onExport}
            className="bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-lg font-semibold flex gap-2"
          >
            <FileSpreadsheet size={18} /> Экспорт
          </button>
        </div>
      </div>
    </div>
  );
}
