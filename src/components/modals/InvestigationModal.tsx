import { useMemo, useState } from "react";
import {
  X,
  Ban,
  ShieldAlert,
  FileSpreadsheet,
  PlugZap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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
import { useNavigate } from "react-router-dom";
import { formatKzDateTime } from "../../utils/time";

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

const INITIAL_EVENTS_COUNT = 12;

function riskBadgeClass(level: RiskLevel) {
  if (level === "CRITICAL") {
    return "bg-red-500/20 text-red-300 border border-red-500/30";
  }

  if (level === "HIGH") {
    return "bg-orange-500/20 text-orange-300 border border-orange-500/30";
  }

  if (level === "MEDIUM") {
    return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
  }

  return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
}

function statusBadgeClass(status?: string) {
  const s = (status || "").toUpperCase();

  if (s === "OPEN" || s === "ESCALATED") {
    return "bg-red-500/20 text-red-300 border border-red-500/30";
  }

  if (s === "INVESTIGATING") {
    return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
  }

  if (s === "RESOLVED" || s === "CLOSED") {
    return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  }

  return "bg-[#0E1A3A] text-gray-300 border border-[#24314F]";
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
  const [showAllEvents, setShowAllEvents] = useState(false);

  const navigate = useNavigate();

  const isResolved =
    incident?.status === "RESOLVED" || incident?.status === "CLOSED";

  const hasBlockedUser =
    incident?.actions?.some(
      (a) => a.type === "SOC_BLOCK_USER" && a.result === "SUCCESS"
    ) ?? false;

  const hasIsolatedSession =
    incident?.actions?.some(
      (a) => a.type === "SOC_ISOLATE_SESSION" && a.result === "SUCCESS"
    ) ?? false;

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

  const hasMoreEvents = (record?.events?.length || 0) > INITIAL_EVENTS_COUNT;
  const visibleEvents = showAllEvents
    ? record.events
    : record.events.slice(0, INITIAL_EVENTS_COUNT);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-4xl max-h-[92vh] rounded-2xl border border-[#1E2A45] bg-[#121A33] shadow-2xl animate-fadeIn overflow-hidden flex flex-col">
          <div className="shrink-0 rounded-t-2xl border-b border-[#1E2A45] bg-[#121A33]">
            <div className="px-6 pt-5 pb-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-red-400 flex items-center gap-2">
                    <ShieldAlert size={26} />
                    Угроза безопасности
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    Ключевые действия вынесены наверх, чтобы оператор видел их сразу
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-red-400 transition"
                >
                  <X size={28} />
                </button>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Risk Score</span>
                  <span className="font-semibold text-white">
                    {risk.score} / 100 ({risk.level})
                  </span>
                </div>

                <div className="w-full h-3 bg-[#0E1A3A] rounded-full overflow-hidden border border-[#24314F]">
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
                    style={{ width: `${Math.max(0, Math.min(100, risk.score))}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[#24314F] bg-[#0E1A3A] p-3">
                  <div className="text-xs text-gray-400">Incident</div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {incident?.id || "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-[#24314F] bg-[#0E1A3A] p-3">
                  <div className="text-xs text-gray-400">Status</div>
                  <div className="mt-1">
                    <span
                      className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${statusBadgeClass(
                        incident?.status
                      )}`}
                    >
                      {incident?.status || "—"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#24314F] bg-[#0E1A3A] p-3">
                  <div className="text-xs text-gray-400">Пользователь</div>
                  <div className="mt-1 text-sm font-semibold text-white break-all">
                    {record.user}
                  </div>
                </div>

                <div className="rounded-xl border border-[#24314F] bg-[#0E1A3A] p-3">
                  <div className="text-xs text-gray-400">IP</div>
                  <div className="mt-1 text-sm font-semibold text-white break-all">
                    {record.ip}
                  </div>
                </div>
              </div>

              {incident && (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-[#24314F] bg-[#0E1A3A] p-3">
                  <div className="text-xs text-gray-400">
                    Created:{" "}
                    <span className="text-gray-200">
                      {formatKzDateTime(incident.createdAt, {
                        seconds: true,
                        naiveInput: "utc",
                      })}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${riskBadgeClass(
                        risk.level
                      )}`}
                    >
                      {risk.level}
                    </span>

                    {incident.backendId && (
                      <button
                        onClick={() => navigate(`/soc/incidents/${incident.backendId}`)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[#0052FF] text-white hover:opacity-90"
                      >
                        Открыть инцидент
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {playbook && (
              <div>
                <PlaybookCard playbook={playbook} reason={reason} />
              </div>
            )}

            <div className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Контекст</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-[#24314F] bg-[#121A33] p-3">
                  <div className="text-xs text-gray-400 mb-1">Пользователь</div>
                  <div className="text-white break-all">{record.user}</div>
                </div>

                <div className="rounded-lg border border-[#24314F] bg-[#121A33] p-3">
                  <div className="text-xs text-gray-400 mb-1">IP</div>
                  <div className="text-white break-all">{record.ip}</div>
                </div>

                <div className="rounded-lg border border-[#24314F] bg-[#121A33] p-3">
                  <div className="text-xs text-gray-400 mb-1">Локация</div>
                  <div className="text-white">{record.location}</div>
                </div>

                <div className="rounded-lg border border-[#24314F] bg-[#121A33] p-3">
                  <div className="text-xs text-gray-400 mb-1">Устройство</div>
                  <div className="text-white break-all">{record.device}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-lg font-semibold text-white">
                  Таймлайн событий
                </h3>

                <div className="text-xs text-gray-400">
                  Показано: {visibleEvents.length} из {record.events.length}
                </div>
              </div>

              <ul className="space-y-2 text-sm">
                {visibleEvents.map((e, i) => (
                  <li
                    key={`${e}-${i}`}
                    className="rounded-lg border border-[#24314F] bg-[#121A33] px-3 py-2 text-gray-300"
                  >
                    {e}
                  </li>
                ))}
              </ul>

              {hasMoreEvents && (
                <button
                  onClick={() => setShowAllEvents((prev) => !prev)}
                  className="mt-3 inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200"
                >
                  {showAllEvents ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showAllEvents ? "Свернуть таймлайн" : "Показать весь таймлайн"}
                </button>
              )}
            </div>

            <div className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Активность команд
              </h3>
              <CommandActivityChart />
            </div>

            <div className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] p-4">
              <label className="text-sm text-gray-300 block mb-2">
                Комментарий аналитика SOC
              </label>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Причина закрытия инцидента, выводы SOC…"
                className="w-full bg-[#121A33] border border-[#24314F] rounded-lg p-3 text-sm text-white resize-none outline-none"
              />

              <div className="mt-2 text-xs text-gray-400">
                Этот комментарий нужен для осмысленного закрытия инцидента
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-[#1E2A45] bg-[#121A33] px-6 py-4">
            <div className="flex flex-col gap-3">
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
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <PlugZap size={18} />
                    {actionLoading === "isolate"
                      ? "Изоляция..."
                      : hasIsolatedSession
                      ? "Сессия изолирована"
                      : "Изолировать сессию"}
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
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <Ban size={18} />
                    {actionLoading === "block"
                      ? "Блокировка..."
                      : hasBlockedUser
                      ? "Пользователь заблокирован"
                      : "Заблокировать пользователя"}
                  </button>

                  <SourceTooltip permission={getPermission("soc_block_user")} />
                </div>

                <button
                  onClick={() => {
                    if (!incident) return;
                    exportIncidentPdf({ incident, record, risk });
                  }}
                  className="bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
                >
                  <FileSpreadsheet size={18} />
                  Экспорт PDF
                </button>

                <button
                  onClick={onExport}
                  className="bg-[#1A243F] hover:bg-[#0E1A3A] text-gray-200 border border-[#1E2A45] px-5 py-2 rounded-lg font-semibold"
                >
                  Экспорт SIEM JSON
                </button>

                <button
                  disabled={!comment.trim() || isResolved}
                  onClick={async () => {
                    if (!incident || !incident.backendId) return;

                    try {
                      await updateIncidentStatus(incident.backendId, "RESOLVED");
                      onClose();
                    } catch (e) {
                      console.error("Failed to close incident", e);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold"
                >
                  Закрыть инцидент
                </button>
              </div>

              <div className="text-xs text-gray-400">
                Для закрытия инцидента нужен комментарий аналитика SOC
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}