import { useMemo, useState } from "react";
import { X, Ban, ShieldAlert, FileSpreadsheet, PlugZap } from "lucide-react";

import SourceTooltip from "../ui/SourceTooltip";
import { buildEffectivePermissions } from "../../utils/effectivePermissions";
import { useAuth } from "../../store/auth";

import CommandActivityChart from "../charts/CommandActivityChart";
import { RiskLevel } from "../../utils/riskScore";
import { Incident } from "../../utils/incident";
import { exportIncidentPdf } from "../../utils/exportIncidentPdf";
import { updateIncidentStatus } from "../../api/incidents";

import PlaybookCard from "../soc/PlaybookCard";
import { detectPlaybookFromTimeline } from "../../soc/playbooks/detectPlaybook";

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
  const [actionLoading, setActionLoading] =
    useState<null | "block" | "isolate">(null);

  const [comment, setComment] = useState("");

  const isResolved = incident?.status === "RESOLVED";
  const hasBlockedUser =
    incident?.actions?.some((a) => a.type === "SOC_BLOCK_USER") ?? false;
  const hasIsolatedSession =
    incident?.actions?.some((a) => a.type === "SOC_ISOLATE_SESSION") ?? false;

  /**
   * === PLAYBOOK DETECTION (UI-ONLY, SAFE) ===
   */
  const timelineForPlaybook = useMemo(() => {
    return (record?.events ?? []).map((line) => {
      const dash = line.split("—").map((s) => s.trim());
      if (dash.length >= 2) {
        return { timestamp: dash[0], action: dash[1] };
      }

      const hyphen = line.split("-").map((s) => s.trim());
      if (hyphen.length >= 2) {
        return { timestamp: hyphen[0], action: hyphen[1] };
      }

      return { action: line };
    });
  }, [record?.events]);

  const { playbook, reason } = useMemo(() => {
    return detectPlaybookFromTimeline(timelineForPlaybook);
  }, [timelineForPlaybook]);

  /**
   * === EFFECTIVE PERMISSIONS (READ-ONLY, SAFE) ===
   */
  const auth = useAuth();
  const roles = auth.user?.roles ?? [];


  const effectivePermissions = useMemo(
    () =>
      buildEffectivePermissions({
        roles,
      }),
    [roles]
  );

  function getPermission(code: string) {
    return (
      effectivePermissions.find((p) => p.code === code) || {
        code,
        granted: false,
        roles: [],
        policies: [],
      }
    );
  }

  // React-safe
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0 overflow-y-auto p-4">
        <div className="mx-auto bg-[#121A33] rounded-2xl w-full max-w-3xl p-6 shadow-2xl border border-[var(--border)] animate-fadeIn">
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

          {/* INCIDENT META */}
          {incident && (
            <div className="mb-5 bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-3">
              <div className="flex justify-between items-center text-sm">
                <div className="text-gray-300">
                  Incident ID:
                  <span className="ml-2 font-semibold text-white">
                    {incident.id}
                  </span>
                </div>

                <span className="px-2 py-1 rounded bg-gray-700 text-gray-200 font-semibold">
                  {incident.status}
                </span>
              </div>

              <div className="text-xs text-gray-400 mt-1">
                Created: {new Date(incident.createdAt).toLocaleString()}
              </div>

              {incident.closedAt && (
                <div className="text-xs text-gray-500 mt-1">
                  Closed: {new Date(incident.closedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* PLAYBOOK */}
          {playbook && (
            <div className="mb-5">
              <PlaybookCard playbook={playbook} reason={reason} />
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

          {/* COMMENT */}
          <div className="mb-5">
            <label className="text-sm text-gray-300 block mb-1">
              Комментарий аналитика SOC
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Причина закрытия инцидента, выводы SOC…"
              className="w-full bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-2 text-sm text-white resize-none"
            />
          </div>

          {/* ACTIONS — ВАЖНО: flex-wrap сохранён */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                disabled={actionLoading === "isolate" || hasIsolatedSession}
                onClick={async () => {
                  try {
                    setActionLoading("isolate");
                    await onIsolate();
                  } finally {
                    setActionLoading(null);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold flex gap-2"
              >
                <PlugZap size={18} /> Изолировать сессию
              </button>

              <SourceTooltip permission={getPermission("soc_isolate_session")} />
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={actionLoading === "block" || hasBlockedUser}
                onClick={async () => {
                  try {
                    setActionLoading("block");
                    await onBlock();
                  } finally {
                    setActionLoading(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold flex gap-2"
              >
                <Ban size={18} /> Заблокировать пользователя
              </button>

              <SourceTooltip permission={getPermission("soc_block_user")} />
            </div>

            <button
              onClick={() => {
                if (!incident) return;
                exportIncidentPdf({ incident, record, risk });
              }}
              className="bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-lg font-semibold flex gap-2"
            >
              <FileSpreadsheet size={18} /> Экспорт PDF
            </button>

            <button
              disabled={!comment.trim() || isResolved}
              onClick={async () => {
                if (!incident) return;

                try {
                  if (incident.backendId) {
                    await updateIncidentStatus(incident.backendId, "RESOLVED");
                  }

                  incident.status = "RESOLVED";
                  incident.closedAt = new Date().toISOString();
                  incident.comments = [
                    ...(incident.comments || []),
                    {
                      author: "soc",
                      message: comment,
                      timestamp: new Date().toISOString(),
                    },
                  ];

                  onClose();
                } catch (e) {
                  console.error("Failed to close incident", e);
                }
              }}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold"
            >
              Закрыть инцидент
            </button>

            <button
              onClick={onExport}
              className="bg-[#1A243F] hover:bg-[#0E1A3A] text-gray-200 border border-[#1E2A45] px-5 py-2 rounded-lg font-semibold"
            >
              Экспорт SOC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
