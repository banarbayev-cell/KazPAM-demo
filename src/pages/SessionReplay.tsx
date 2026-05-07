import {
  Play,
  Pause,
  Download,
  Search,
  Copy,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Header from "../components/Header";
import Sidebar from "../components/ui/sidebar";
import {
  fetchRecordingEvents,
  fetchRecordingMeta,
  RecordingEvent,
  RecordingMeta,
  downloadRecording,
} from "../api/recordings";
import { api } from "../services/api";

type EventFilter = "all" | "command" | "auth" | "alert" | "file";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "—";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs}ч ${mins}м ${secs}с`;
  if (mins > 0) return `${mins}м ${secs}с`;
  return `${secs}с`;
}

function getStatusClass(status?: string) {
  switch (status) {
    case "READY":
      return "bg-green-500/20 text-green-300 border border-green-500/30";
    case "PROCESSING":
      return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
    case "FAILED":
      return "bg-red-500/20 text-red-300 border border-red-500/30";
    default:
      return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
  }
}

function getEventTypeClass(type?: string) {
  switch (String(type || "").toLowerCase()) {
    case "command":
      return "text-cyan-300";
    case "auth":
      return "text-green-300";
    case "alert":
      return "text-red-300";
    case "file":
      return "text-purple-300";
    default:
      return "text-gray-300";
  }
}

function getEventTypeBadge(type?: string) {
  switch (String(type || "").toLowerCase()) {
    case "command":
      return "bg-cyan-500/15 text-cyan-200 border border-cyan-500/30";
    case "auth":
      return "bg-green-500/15 text-green-200 border border-green-500/30";
    case "alert":
      return "bg-red-500/15 text-red-200 border border-red-500/30";
    case "file":
      return "bg-purple-500/15 text-purple-200 border border-purple-500/30";
    default:
      return "bg-gray-500/15 text-gray-200 border border-gray-500/30";
  }
}

function eventRisk(event: RecordingEvent): RiskLevel {
  const type = String(event.type || "").toLowerCase();
  const text = String(event.text || "").toLowerCase();

  if (type === "alert") return "HIGH";

  const criticalPatterns = [
    "rm -rf",
    "mkfs",
    "dd if=",
    "/etc/shadow",
    "passwd",
    "useradd",
    "net user",
    "disable firewall",
    "iptables -f",
  ];

  const highPatterns = [
    "sudo",
    "su ",
    "chmod 777",
    "chown",
    "curl ",
    "wget ",
    "nc ",
    "ncat",
    "powershell",
    "reg add",
    "scp ",
    "ssh ",
  ];

  if (criticalPatterns.some((p) => text.includes(p))) return "CRITICAL";
  if (highPatterns.some((p) => text.includes(p))) return "HIGH";
  if (type === "command") return "LOW";
  if (type === "file") return "MEDIUM";
  return "LOW";
}

function riskClass(level: RiskLevel) {
  switch (level) {
    case "CRITICAL":
      return "bg-red-600/25 text-red-200 border border-red-500/40";
    case "HIGH":
      return "bg-orange-500/20 text-orange-200 border border-orange-500/40";
    case "MEDIUM":
      return "bg-yellow-500/20 text-yellow-200 border border-yellow-500/40";
    default:
      return "bg-green-500/20 text-green-200 border border-green-500/30";
  }
}

function calculateReplayRisk(events: RecordingEvent[]) {
  let score = 0;

  for (const event of events) {
    const level = eventRisk(event);

    if (level === "CRITICAL") score += 35;
    else if (level === "HIGH") score += 20;
    else if (level === "MEDIUM") score += 10;
  }

  score = Math.min(100, score);

  let level: RiskLevel = "LOW";
  if (score >= 80) level = "CRITICAL";
  else if (score >= 60) level = "HIGH";
  else if (score >= 30) level = "MEDIUM";

  return { score, level };
}

function copyTextFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

async function copyText(text: string) {
  if (!text) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // fallback below
  }

  copyTextFallback(text);
}

export default function SessionReplay() {
  const navigate = useNavigate();
  const { id } = useParams();
  const recordingId = Number(id);

  const [meta, setMeta] = useState<RecordingMeta | null>(null);
  const [events, setEvents] = useState<RecordingEvent[]>([]);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [onlyRisky, setOnlyRisky] = useState(false);

  const consoleRef = useRef<HTMLDivElement | null>(null);
  const [creatingIncident, setCreatingIncident] = useState(false);

  const loadReplay = async () => {
    if (!recordingId || Number.isNaN(recordingId)) {
      setError("Некорректный ID записи");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [metaData, eventsData] = await Promise.all([
        fetchRecordingMeta(recordingId),
        fetchRecordingEvents(recordingId),
      ]);

      setMeta(metaData);
      setEvents(Array.isArray(eventsData.events) ? eventsData.events : []);
      setCursor(0);
      setPlaying(false);
    } catch {
      setError("Не удалось загрузить replay сессии");
      setMeta(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();

    return events.filter((event) => {
      const type = String(event.type || "").toLowerCase();
      const text = String(event.text || "").toLowerCase();
      const ts = String(event.ts || "").toLowerCase();

      const matchesType = eventFilter === "all" ? true : type === eventFilter;
      const matchesSearch = !q || text.includes(q) || type.includes(q) || ts.includes(q);

      const risk = eventRisk(event);
      const matchesRisk = !onlyRisky || risk === "HIGH" || risk === "CRITICAL";

      return matchesType && matchesSearch && matchesRisk;
    });
  }, [events, search, eventFilter, onlyRisky]);

  useEffect(() => {
    setPlaying(false);
    setCursor(0);
  }, [search, eventFilter, onlyRisky]);

  useEffect(() => {
    if (!playing || filteredEvents.length === 0) return;

    const delay = Math.max(150, 800 / speed);

    const timer = setInterval(() => {
      setCursor((prev) => {
        if (prev >= filteredEvents.length - 1) {
          setPlaying(false);
          return prev;
        }

        return prev + 1;
      });
    }, delay);

    return () => clearInterval(timer);
  }, [playing, speed, filteredEvents.length]);

  useEffect(() => {
    if (!consoleRef.current) return;
    consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [cursor]);

  const visibleEvents = useMemo(() => {
    if (filteredEvents.length === 0) return [];
    return filteredEvents.slice(0, cursor + 1);
  }, [filteredEvents, cursor]);

  const currentEvent = filteredEvents[cursor] ?? null;

  const stats = useMemo(() => {
    const commandCount = events.filter((e) => String(e.type).toLowerCase() === "command").length;
    const authCount = events.filter((e) => String(e.type).toLowerCase() === "auth").length;
    const alertCount = events.filter((e) => String(e.type).toLowerCase() === "alert").length;
    const fileCount = events.filter((e) => String(e.type).toLowerCase() === "file").length;
    const riskyCount = events.filter((e) => {
      const level = eventRisk(e);
      return level === "HIGH" || level === "CRITICAL";
    }).length;

    return {
      total: events.length,
      commandCount,
      authCount,
      alertCount,
      fileCount,
      riskyCount,
      risk: calculateReplayRisk(events),
    };
  }, [events]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadRecording(recordingId);
      toast.success(`Запись #${recordingId} скачана`);
    } catch (e: any) {
      toast.error(e?.message || "Не удалось скачать запись");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCurrentEvent = async () => {
    if (!currentEvent) return;

    await copyText(`[${currentEvent.ts}] ${currentEvent.type}: ${currentEvent.text}`);
    toast.success("Текущее событие скопировано");
  };

  const jumpToFirstRisk = () => {
    const idx = filteredEvents.findIndex((event) => {
      const level = eventRisk(event);
      return level === "HIGH" || level === "CRITICAL";
    });

    if (idx === -1) {
      toast.info("Риск-события не найдены");
      return;
    }

    setPlaying(false);
    setCursor(idx);
    toast.success("Переход к первому риск-событию");
  };

  const handleCreateIncident = async () => {
    if (!meta) {
      toast.error("Данные записи недоступны");
      return;
    }

    const riskRank: Record<RiskLevel, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };

    const firstRiskEvent =
      events.find((event) => {
        const level = eventRisk(event);
        return level === "HIGH" || level === "CRITICAL";
      }) || null;

    const currentEventLevel = currentEvent ? eventRisk(currentEvent) : null;

    const selectedEvent =
      currentEvent &&
      currentEventLevel &&
      (currentEventLevel === "HIGH" || currentEventLevel === "CRITICAL")
        ? currentEvent
        : firstRiskEvent || currentEvent || null;

    const selectedEventLevel = selectedEvent
      ? eventRisk(selectedEvent)
      : stats.risk.level;

    const severity =
      riskRank[stats.risk.level] >= riskRank[selectedEventLevel]
        ? stats.risk.level
        : selectedEventLevel;

    const title = selectedEvent
      ? `Replay ${severity} event · recording #${recordingId}`
      : `Replay investigation · recording #${recordingId}`;

    const ipFromReplay =
      events
        .map((e) =>
          String(e.text || "").match(
            /\b(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\b/
          )?.[0]
        )
        .find(Boolean) || "0.0.0.0";

    const targetUser = String(meta.user || "unknown");
    const targetSystem = `${String(meta.protocol || "session").toUpperCase()} replay #${recordingId}`;

    const details = {
      source: "session_replay",
      recording_id: recordingId,
      session_id: meta.session_id ?? null,
      user: meta.user ?? null,
      protocol: meta.protocol ?? null,
      recording_status: meta.status ?? null,
      risk_score: stats.risk.score,
      risk_level: stats.risk.level,
      selected_event_risk: selectedEventLevel,
      incident_severity: severity,
      event: selectedEvent
        ? {
            time: selectedEvent.ts,
            type: selectedEvent.type,
            text: selectedEvent.text,
            risk: selectedEventLevel,
          }
        : null,
      reason: "Incident created manually from Replay page",
    };

    try {
      setCreatingIncident(true);

      await api.post("/incidents/", {
        title,
        summary: title,
        description: "Incident created manually from Replay page",

        user: targetUser,
        target_user: targetUser,
        system: targetSystem,
        ip: ipFromReplay,

        severity,
        risk_score: stats.risk.score,
        correlation_id: `replay-${recordingId}-${Date.now()}`,

        details,
      });

      toast.success("Инцидент создан из Replay");
    } catch (e: any) {
      toast.error(e?.message || "Не удалось создать инцидент");
    } finally {
      setCreatingIncident(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-8 overflow-y-auto">
          <div className="bg-[#EDEEF2] rounded p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Replay сессии
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Enterprise replay: события, команды, риск-индикаторы, фильтры и скачивание записи
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadReplay}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 rounded"
                >
                  Обновить
                </button>

                <button
                  onClick={handleDownload}
                  disabled={downloading || !meta || meta.status !== "READY"}
                  className="px-4 py-2 bg-[#1A243F] hover:bg-[#223055] text-white rounded disabled:bg-gray-600 flex items-center gap-2"
                >
                  <Download size={16} />
                  {downloading ? "Скачивание..." : "Скачать"}
                </button>

                <button
                  onClick={() => navigate("/recordings")}
                  className="px-4 py-2 bg-[#0052FF] hover:bg-blue-700 text-white rounded"
                >
                  Назад
                </button>
              </div>
            </div>

            {loading ? (
              <div className="bg-[#121A33] text-white rounded-xl p-6">
                Загрузка replay...
              </div>
            ) : error ? (
              <div className="bg-[#121A33] text-red-300 rounded-xl p-6 border border-red-500/30">
                {error}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <StatCard label="Всего событий" value={stats.total} />
                  <StatCard label="Команды" value={stats.commandCount} />
                  <StatCard label="Auth" value={stats.authCount} />
                  <StatCard label="Alerts" value={stats.alertCount} />
                  <div className="rounded-xl bg-[#121A33] border border-[#1E2A45] p-4">
                    <div className="text-sm text-gray-400">Risk score</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-2xl font-bold text-white">
                        {stats.risk.score}
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${riskClass(stats.risk.level)}`}>
                        {stats.risk.level}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-[#121A33] rounded-xl p-6 text-white">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck size={18} className="text-green-300" />
                      <h2 className="text-lg font-semibold">Информация о записи</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <InfoRow label="Recording ID" value={`#${meta?.id ?? recordingId}`} />
                      <InfoRow label="Session ID" value={meta?.session_id ? `#${meta.session_id}` : "—"} />
                      <InfoRow label="Пользователь" value={meta?.user || "—"} />
                      <InfoRow label="Протокол" value={(meta?.protocol || "—").toUpperCase()} />
                      <InfoRow label="Начало" value={meta?.start_time || "—"} />
                      <InfoRow label="Окончание" value={meta?.end_time || "—"} />
                      <InfoRow label="Длительность" value={formatDuration(meta?.duration)} />
                      <div>
                        <div className="text-gray-400 mb-1">Статус</div>
                        <span
                          className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${getStatusClass(
                            meta?.status
                          )}`}
                        >
                          {meta?.status || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-5">
                      {meta?.session_id && (
                        <button
                          onClick={() => navigate(`/audit?session_id=${meta.session_id}`)}
                          className="px-4 py-2 rounded bg-[#0052FF] hover:bg-blue-700 text-white text-sm"
                        >
                          Открыть Audit этой сессии
                        </button>
                      )}

                      <button
                        onClick={jumpToFirstRisk}
                        className="px-4 py-2 rounded bg-[#1A243F] hover:bg-[#223055] text-white text-sm"
                      >
                        Найти риск-событие
                      </button>

                      <button
                        onClick={handleCreateIncident}
                        disabled={creatingIncident || !meta}
                        className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
                      >
                        {creatingIncident ? "Создание..." : "Создать инцидент"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#121A33] rounded-xl p-6 text-white">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle size={18} className="text-yellow-300" />
                      <h2 className="text-lg font-semibold">Текущее событие</h2>
                    </div>

                    {currentEvent ? (
                      <div className="space-y-4 text-sm">
                        <InfoRow label="Время" value={currentEvent.ts} />

                        <div>
                          <div className="text-gray-400 mb-1">Тип</div>
                          <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${getEventTypeBadge(currentEvent.type)}`}>
                            {currentEvent.type}
                          </span>
                        </div>

                        <div>
                          <div className="text-gray-400 mb-1">Risk</div>
                          <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${riskClass(eventRisk(currentEvent))}`}>
                            {eventRisk(currentEvent)}
                          </span>
                        </div>

                        <div>
                          <div className="text-gray-400 mb-1">Содержимое</div>
                          <div className="rounded-lg bg-[#0E1A3A] border border-[#1E2A45] p-3 break-all font-mono text-xs">
                            {currentEvent.text}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="text-gray-300">
                            Позиция:{" "}
                            {filteredEvents.length === 0
                              ? "0 / 0"
                              : `${cursor + 1} / ${filteredEvents.length}`}
                          </div>

                          <button
                            onClick={handleCopyCurrentEvent}
                            className="px-3 py-2 rounded bg-[#1A243F] hover:bg-[#223055] text-white inline-flex items-center gap-2"
                          >
                            <Copy size={15} />
                            Копировать
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        События отсутствуют
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#121A33] rounded-xl p-6 text-white">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="relative flex-1 min-w-[260px]">
                      <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск по событиям replay..."
                        className="w-full pl-9 pr-3 py-2 bg-[#0E1A3A] border border-[#1E2A45] rounded text-white outline-none focus:border-[#0052FF]"
                      />
                    </div>

                    <select
                      value={eventFilter}
                      onChange={(e) => setEventFilter(e.target.value as EventFilter)}
                      className="px-3 py-2 bg-[#0E1A3A] text-white rounded border border-[#1E2A45] outline-none"
                    >
                      <option value="all">Все события</option>
                      <option value="command">command</option>
                      <option value="auth">auth</option>
                      <option value="alert">alert</option>
                      <option value="file">file</option>
                    </select>

                    <label className="flex items-center gap-2 text-sm text-gray-300 select-none">
                      <input
                        type="checkbox"
                        checked={onlyRisky}
                        onChange={(e) => setOnlyRisky(e.target.checked)}
                      />
                      Только риск-события
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <button
                      onClick={() => setPlaying(!playing)}
                      disabled={filteredEvents.length === 0}
                      className="p-3 bg-[#0052FF] text-white rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      {playing ? <Pause size={18} /> : <Play size={18} />}
                    </button>

                    <button
                      onClick={() => {
                        setPlaying(false);
                        setCursor(0);
                      }}
                      className="px-4 py-2 bg-[#1A243F] text-white rounded hover:bg-[#223055] inline-flex items-center gap-2"
                    >
                      <RotateCcw size={16} />
                      В начало
                    </button>

                    <button
                      onClick={() => {
                        setPlaying(false);
                        setCursor((prev) => Math.max(prev - 1, 0));
                      }}
                      className="px-4 py-2 bg-[#1A243F] text-white rounded hover:bg-[#223055] inline-flex items-center gap-2"
                    >
                      <SkipBack size={16} />
                      Назад
                    </button>

                    <button
                      onClick={() => {
                        setPlaying(false);
                        setCursor((prev) =>
                          Math.min(prev + 1, Math.max(filteredEvents.length - 1, 0))
                        );
                      }}
                      className="px-4 py-2 bg-[#1A243F] text-white rounded hover:bg-[#223055] inline-flex items-center gap-2"
                    >
                      <SkipForward size={16} />
                      Вперёд
                    </button>

                    <select
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="px-3 py-2 bg-[#1A243F] text-white rounded border border-[#2B3655] outline-none"
                    >
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={4}>4x</option>
                      <option value={8}>8x</option>
                    </select>

                    <div className="text-sm text-gray-300 ml-auto">
                      Показано: {filteredEvents.length} из {events.length}
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={Math.max(filteredEvents.length - 1, 0)}
                    value={Math.min(cursor, Math.max(filteredEvents.length - 1, 0))}
                    onChange={(e) => {
                      setPlaying(false);
                      setCursor(Number(e.target.value));
                    }}
                    className="w-full accent-[#0052FF]"
                  />
                </div>

                <div className="bg-[#121A33] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-[#1A243F] text-gray-200 font-semibold flex items-center justify-between">
                    <span>Replay Console</span>
                    <span className="text-xs text-gray-400">
                      {visibleEvents.length} / {filteredEvents.length}
                    </span>
                  </div>

                  <div
                    ref={consoleRef}
                    className="h-[460px] overflow-y-auto bg-[#0E1A3A] text-green-300 font-mono text-sm"
                  >
                    {visibleEvents.length === 0 ? (
                      <div className="p-6 text-gray-400">
                        Нет событий для воспроизведения
                      </div>
                    ) : (
                      visibleEvents.map((event, index) => {
                        const level = eventRisk(event);
                        const risky = level === "HIGH" || level === "CRITICAL";

                        return (
                          <div
                            key={`${event.ts}-${index}`}
                            className={`px-6 py-3 border-t border-[#24304F] hover:bg-[#0A0F24] transition ${
                              risky ? "bg-red-500/5" : ""
                            }`}
                          >
                            <span className="text-gray-400">[{event.ts}]</span>{" "}
                            <span className={getEventTypeClass(event.type)}>
                              {event.type}
                            </span>{" "}
                            <span className={`ml-2 px-2 py-0.5 rounded text-[10px] ${riskClass(level)}`}>
                              {level}
                            </span>{" "}
                            <span className="break-all">{event.text}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-[#121A33] border border-[#1E2A45] p-4">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-bold text-white mt-2">{value}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <div className="text-gray-400 mb-1">{label}</div>
      <div className="text-gray-100 break-all">{value ?? "—"}</div>
    </div>
  );
}