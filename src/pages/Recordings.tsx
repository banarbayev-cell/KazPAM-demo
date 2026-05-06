import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "../components/Header";
import Sidebar from "../components/ui/sidebar";
import {
  fetchRecordings,
  fetchRecordingEvents,
  fetchRecordingMeta,
  Recording,
  RecordingEvent,
  downloadRecording,
} from "../api/recordings";

type RiskLevel = "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type EnrichedRecording = Recording & {
  session_id?: number | null;
  event_count: number;
  command_count: number;
  alert_count: number;
  risk_score: number | null;
  risk_level: RiskLevel;
};

function formatDuration(seconds: number, status: Recording["status"]) {
  if (status === "PROCESSING" && (!seconds || seconds <= 0)) {
    return "Обрабатывается";
  }

  if (!seconds || seconds <= 0) return "—";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs}ч ${mins}м ${secs}с`;
  if (mins > 0) return `${mins}м ${secs}с`;
  return `${secs}с`;
}

function formatSize(size: number | null, status: Recording["status"]) {
  if ((size === null || size === undefined) && status === "PROCESSING") {
    return "Считается";
  }

  if (size === null || size === undefined) return "—";
  if (size === 0) return "0 KB";

  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function formatTotalSize(recordings: EnrichedRecording[]) {
  const total = recordings.reduce((sum, r) => {
    return sum + (typeof r.size === "number" ? r.size : 0);
  }, 0);

  if (total <= 0) return "—";

  const kb = total / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function getStatusClass(status: Recording["status"]) {
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

function getRiskClass(level: RiskLevel) {
  switch (level) {
    case "CRITICAL":
      return "bg-red-500/20 text-red-300 border border-red-500/30";
    case "HIGH":
      return "bg-orange-500/20 text-orange-300 border border-orange-500/30";
    case "MEDIUM":
      return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
    case "LOW":
      return "bg-green-500/20 text-green-300 border border-green-500/30";
    default:
      return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
  }
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function calculateReplayRisk(events: RecordingEvent[]) {
  let score = 0;

  for (const event of events) {
    const type = String(event.type || "").toLowerCase();
    const text = String(event.text || "").toLowerCase();

    if (type.includes("alert")) score += 25;
    if (text.includes("rm -rf")) score += 45;
    if (text.includes("/etc/passwd")) score += 35;
    if (text.includes("/etc/shadow")) score += 45;
    if (text.includes("id_rsa") || text.includes("private key")) score += 35;
    if (text.includes("sudo su") || text === "su" || text.startsWith("su ")) {
      score += 30;
    }
    if (text.includes("chmod 777")) score += 25;
    if (text.includes("curl ") || text.includes("wget ")) score += 15;
    if (text.includes("fail") || text.includes("denied") || text.includes("error")) {
      score += 15;
    }
  }

  score = Math.min(100, score);

  return {
    score,
    level: riskLevelFromScore(score),
  };
}

function makeBaseRecording(recording: Recording): EnrichedRecording {
  return {
    ...recording,
    session_id: (recording as any).session_id ?? null,
    event_count: 0,
    command_count: 0,
    alert_count: 0,
    risk_score: null,
    risk_level: "UNKNOWN",
  };
}

export default function Recordings() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | Recording["status"]>("ALL");
  const [protocolFilter, setProtocolFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState<"ALL" | RiskLevel>("ALL");

  const [recordings, setRecordings] = useState<EnrichedRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const navigate = useNavigate();

  const loadRecordings = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchRecordings();
      const safe = Array.isArray(data) ? data : [];
      const base = safe.map(makeBaseRecording);

      const enriched = await Promise.all(
        base.map(async (recording) => {
          const [metaResult, eventsResult] = await Promise.allSettled([
            fetchRecordingMeta(recording.id),
            fetchRecordingEvents(recording.id),
          ]);

          const meta =
            metaResult.status === "fulfilled" ? metaResult.value : null;

          const events =
            eventsResult.status === "fulfilled" &&
            Array.isArray(eventsResult.value.events)
              ? eventsResult.value.events
              : [];

          const commandCount = events.filter((e) =>
            String(e.type || "").toLowerCase().includes("command")
          ).length;

          const alertCount = events.filter((e) =>
            String(e.type || "").toLowerCase().includes("alert")
          ).length;

          const risk = calculateReplayRisk(events);

          return {
            ...recording,
            session_id: meta?.session_id ?? recording.session_id ?? null,
            event_count: events.length,
            command_count: commandCount,
            alert_count: alertCount,
            risk_score: events.length > 0 ? risk.score : null,
            risk_level: events.length > 0 ? risk.level : "UNKNOWN",
          };
        })
      );

      setRecordings(enriched);
    } catch (err) {
      console.error("Failed to load recordings:", err);
      setRecordings([]);
      setError("Не удалось загрузить записи сессий");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  const protocolOptions = useMemo(() => {
    const values = new Set<string>();

    recordings.forEach((r) => {
      const protocol = String(r.protocol || "").trim().toUpperCase();
      if (protocol) values.add(protocol);
    });

    return Array.from(values).sort();
  }, [recordings]);

  const stats = useMemo(() => {
    const total = recordings.length;
    const ready = recordings.filter((r) => r.status === "READY").length;
    const processing = recordings.filter((r) => r.status === "PROCESSING").length;
    const failed = recordings.filter((r) => r.status === "FAILED").length;
    const highRisk = recordings.filter(
      (r) => r.risk_level === "HIGH" || r.risk_level === "CRITICAL"
    ).length;

    return {
      total,
      ready,
      processing,
      failed,
      highRisk,
      totalSize: formatTotalSize(recordings),
    };
  }, [recordings]);

  const filtered = useMemo<EnrichedRecording[]>(() => {
    const safeRecordings = Array.isArray(recordings) ? recordings : [];
    const q = search.trim().toLowerCase();

    return safeRecordings.filter((r) => {
      const protocol = String(r.protocol || "").trim().toUpperCase();

      const matchesStatus =
        statusFilter === "ALL" ? true : r.status === statusFilter;

      const matchesProtocol =
        protocolFilter === "ALL" ? true : protocol === protocolFilter;

      const matchesRisk =
        riskFilter === "ALL" ? true : r.risk_level === riskFilter;

      const matchesSearch =
        !q ||
        String(r.id ?? "").includes(q) ||
        String(r.session_id ?? "").includes(q) ||
        String(r.user ?? "").toLowerCase().includes(q) ||
        String(r.protocol ?? "").toLowerCase().includes(q) ||
        String(r.date ?? "").toLowerCase().includes(q) ||
        String(r.status ?? "").toLowerCase().includes(q) ||
        String(r.risk_level ?? "").toLowerCase().includes(q);

      return matchesStatus && matchesProtocol && matchesRisk && matchesSearch;
    });
  }, [recordings, search, statusFilter, protocolFilter, riskFilter]);

  const handleDownload = async (recordingId: number) => {
    try {
      setDownloadingId(recordingId);
      await downloadRecording(recordingId);
      toast.success(`Запись #${recordingId} скачана`);
    } catch (e: any) {
      toast.error(e?.message || "Не удалось скачать запись");
    } finally {
      setDownloadingId(null);
    }
  };

  const goToAudit = (sessionId?: number | null) => {
    if (!sessionId) {
      toast.info("Session ID для этой записи недоступен");
      return;
    }

    navigate(`/audit?session_id=${sessionId}`);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-8 overflow-y-auto">
          <div className="bg-[#EDEEF2] rounded p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Записи сессий
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Enterprise replay-каталог: Recording ID, Session ID, риск,
                  события, команды, Audit и скачивание записи.
                </p>
              </div>

              <button
                onClick={loadRecordings}
                className="px-4 py-2 rounded bg-[#0052FF] hover:bg-[#0046D8] text-white"
              >
                Обновить
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <StatCard label="Всего записей" value={stats.total} />
              <StatCard label="READY" value={stats.ready} />
              <StatCard label="PROCESSING" value={stats.processing} />
              <StatCard label="FAILED" value={stats.failed} />
              <StatCard label="High / Critical" value={stats.highRisk} />
              <StatCard label="Общий размер" value={stats.totalSize} />
            </div>

            <div className="flex flex-wrap gap-3 items-center mb-4">
              <input
                type="text"
                placeholder="Поиск: recording_id / session_id / пользователь / протокол / риск..."
                className="flex-1 min-w-[280px] p-3 border border-gray-300 rounded bg-white text-gray-900"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "ALL" | Recording["status"])
                }
                className="p-3 border border-gray-300 rounded bg-white text-gray-900"
              >
                <option value="ALL">Все статусы</option>
                <option value="READY">READY</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="FAILED">FAILED</option>
              </select>

              <select
                value={protocolFilter}
                onChange={(e) => setProtocolFilter(e.target.value)}
                className="p-3 border border-gray-300 rounded bg-white text-gray-900"
              >
                <option value="ALL">Все протоколы</option>
                {protocolOptions.map((protocol) => (
                  <option key={protocol} value={protocol}>
                    {protocol}
                  </option>
                ))}
              </select>

              <select
                value={riskFilter}
                onChange={(e) =>
                  setRiskFilter(e.target.value as "ALL" | RiskLevel)
                }
                className="p-3 border border-gray-300 rounded bg-white text-gray-900"
              >
                <option value="ALL">Все риски</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              Показано:{" "}
              <span className="font-semibold text-gray-900">
                {filtered.length}
              </span>{" "}
              из{" "}
              <span className="font-semibold text-gray-900">
                {recordings.length}
              </span>
            </div>

            {loading ? (
              <div className="bg-[#121A33] text-white rounded-xl p-6">
                Загрузка записей и risk-summary...
              </div>
            ) : error ? (
              <div className="bg-[#121A33] text-red-300 rounded-xl p-6 border border-red-500/30">
                {error}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-[#121A33] text-gray-300 rounded-xl p-6">
                Записи не найдены
              </div>
            ) : (
              <div className="bg-[#121A33] rounded-2xl overflow-hidden border border-[#1E2A45]">
                <table className="w-full text-white text-sm">
                  <thead className="bg-[#1A243F] text-left text-gray-300">
                    <tr>
                      <th className="p-4">Recording</th>
                      <th className="p-4">Session</th>
                      <th className="p-4">Пользователь</th>
                      <th className="p-4">Протокол</th>
                      <th className="p-4">Дата</th>
                      <th className="p-4">Длительность</th>
                      <th className="p-4">События</th>
                      <th className="p-4">Risk</th>
                      <th className="p-4">Размер</th>
                      <th className="p-4">Статус</th>
                      <th className="p-4 text-right">Действия</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-[#24304F] hover:bg-[#0E1A3A] transition"
                      >
                        <td className="p-4 font-mono text-[#3BE3FD]">
                          #{r.id}
                        </td>

                        <td className="p-4 font-mono">
                          {r.session_id ? `#${r.session_id}` : "—"}
                        </td>

                        <td className="p-4">{r.user || "—"}</td>

                        <td className="p-4 uppercase">
                          <span className="inline-flex px-3 py-1 rounded-full bg-[#0E1A3A] text-gray-200 border border-[#1E2A45] text-xs font-semibold">
                            {r.protocol || "—"}
                          </span>
                        </td>

                        <td className="p-4 whitespace-nowrap">{r.date || "—"}</td>

                        <td className="p-4">
                          {formatDuration(r.duration, r.status)}
                        </td>

                        <td className="p-4">
                          <div className="space-y-1 text-xs text-gray-300">
                            <div>Всего: {r.event_count}</div>
                            <div>Команды: {r.command_count}</div>
                            <div>Alerts: {r.alert_count}</div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit px-3 py-1 rounded-lg text-xs font-semibold ${getRiskClass(
                                r.risk_level
                              )}`}
                            >
                              {r.risk_level}
                            </span>

                            <span className="text-xs text-gray-400">
                              {r.risk_score === null ? "score: —" : `score: ${r.risk_score}`}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">{formatSize(r.size, r.status)}</td>

                        <td className="p-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${getStatusClass(
                              r.status
                            )}`}
                          >
                            {r.status}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            {r.status === "READY" || r.status === "PROCESSING" ? (
                              <button
                                onClick={() => navigate(`/recordings/${r.id}`)}
                                className="px-3 py-2 bg-[#0052FF] hover:bg-blue-700 text-white rounded text-xs"
                              >
                                Replay
                              </button>
                            ) : (
                              <button
                                disabled
                                className="px-3 py-2 bg-gray-700 text-gray-400 rounded text-xs cursor-not-allowed"
                              >
                                Replay
                              </button>
                            )}

                            <button
                              onClick={() => goToAudit(r.session_id)}
                              disabled={!r.session_id}
                              className="px-3 py-2 bg-[#1A243F] hover:bg-[#223055] text-white rounded text-xs disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              Audit
                            </button>

                            {r.status === "READY" && (
                              <button
                                onClick={() => handleDownload(r.id)}
                                disabled={downloadingId === r.id}
                                className="px-3 py-2 bg-[#1A243F] hover:bg-[#223055] text-white rounded text-xs disabled:bg-gray-600"
                              >
                                {downloadingId === r.id ? "..." : "Скачать"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    <div className="rounded-xl border border-[#1E2A45] bg-[#121A33] p-4 text-white shadow">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}