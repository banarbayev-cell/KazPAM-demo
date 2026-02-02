// src/pages/IncidentDetails.tsx

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_URL } from "../api/config";
import { useAuth } from "../store/auth";
import { fetchIncidentTimelineV3, TimelineV3 } from "../api/incidentsV3";
import { fetchIncidentActions, IncidentAction } from "../api/incidentActions";


type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED";

interface BackendIncident {
  id: number;
  status: IncidentStatus;
  severity: string;
  risk_score: number;
  user: string;
  system: string;
  ip: string;
  summary?: string;
  created_at: string;
  closed_at?: string | null;
  correlation_id?: string | null;
}

function uebaBadge(level?: string) {
  const l = (level || "").toUpperCase();
  if (l === "CRITICAL") return "text-red-300 border-red-500/30";
  if (l === "HIGH") return "text-yellow-300 border-yellow-500/30";
  if (l === "MEDIUM") return "text-blue-300 border-blue-500/30";
  return "text-gray-200 border-[#1E2A45]";
}

export default function IncidentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);
  

  const [incident, setIncident] = useState<BackendIncident | null>(null);
  const [timelineV3, setTimelineV3] = useState<TimelineV3 | null>(null);
  const [actions, setActions] = useState<IncidentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const incidentId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }, [id]);

  // ============================
  // LOAD INCIDENT + UEBA V3 (READ-ONLY)
  // ============================
  useEffect(() => {
  if (!token || !incidentId) return;

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1️⃣ Incident header
      const res = await fetch(`${API_URL}/incidents/${incidentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load incident (${res.status})`);
      const data = await res.json();
      setIncident(data);

      // 2️⃣ UEBA v3 (optional)
      try {
        const v3 = await fetchIncidentTimelineV3(incidentId);
        setTimelineV3(v3);
      } catch {
        setTimelineV3(null);
      }

      // 3️⃣ SOC actions history (audit-based, safe)
      try {
        const a = await fetchIncidentActions(incidentId);
        setActions(a);
      } catch {
        setActions([]);
      }

    } catch (e: any) {
      setError(e.message || "Failed to load incident");
    } finally {
      setLoading(false);
    }
  };

  load();
}, [incidentId, token]);


  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Loading incident…</div>;
  }

  if (error || !incident) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-red-400">{error || "Incident not found"}</div>
        <button
          onClick={() => navigate("/soc")}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back to SOC
        </button>
      </div>
    );
  }

  const ueba = timelineV3?.ueba;
  const signals = timelineV3?.signals || [];
  const timeline = timelineV3?.timeline || [];

  return (
    <div className="p-8 space-y-8">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Incident #{incident.id}
          </h1>
          <div className="mt-2 text-sm text-gray-400">
            Created: {incident.created_at}
            {incident.closed_at && <> · Closed: {incident.closed_at}</>}
          </div>
        </div>

        <button
          onClick={() => navigate("/soc")}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back to SOC
        </button>
      </div>

      {/* SUMMARY */}
      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-sm text-gray-400">Status</div>
          <div className="text-lg font-semibold text-white">{incident.status}</div>
        </div>

        <div>
          <div className="text-sm text-gray-400">Severity</div>
          <div className="text-lg font-semibold text-white">{incident.severity}</div>
        </div>

        <div>
          <div className="text-sm text-gray-400">Risk score</div>
          <div className="text-lg font-semibold text-white">{incident.risk_score}</div>
        </div>

        <div>
          <div className="text-sm text-gray-400">Correlation ID</div>
          <div className="text-sm text-white break-all">
            {incident.correlation_id || "—"}
          </div>
        </div>
      </div>

      {/* CONTEXT */}
      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">Context</div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400">User</div>
            <div className="text-white">{incident.user}</div>
          </div>

          <div>
            <div className="text-gray-400">System</div>
            <div className="text-white">{incident.system}</div>
          </div>

          <div>
            <div className="text-gray-400">Source IP</div>
            <div className="text-white">{incident.ip}</div>
          </div>
        </div>

        {incident.summary && (
          <div className="pt-4 text-sm text-gray-300">{incident.summary}</div>
        )}
      </div>

      {/* UEBA SUMMARY */}
      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400 font-semibold">UEBA Summary</div>

          {ueba?.level ? (
            <span
              className={`px-2 py-1 text-xs rounded border ${uebaBadge(
                ueba.level
              )}`}
            >
              {ueba.level}
            </span>
          ) : (
            <span className="px-2 py-1 text-xs rounded border border-[#1E2A45] text-gray-300">
              N/A
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-400">Score</div>
            <div className="text-xl font-semibold text-white">
              {ueba?.score ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-400">Signals</div>
            <div className="text-xl font-semibold text-white">
              {ueba?.signals_count ?? signals.length}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-400">Window</div>
            <div className="text-sm text-white">
              expand: {timelineV3?.window_minutes?.sessions_expand ?? "—"}m ·
              fallback:{" "}
              {timelineV3?.window_minutes?.fallback_around_incident ?? "—"}m
            </div>
          </div>
        </div>

        {ueba?.explain?.length ? (
          <ul className="pt-2 text-sm text-gray-400 space-y-1">
            {ueba.explain.map((x) => (
              <li key={x}>• {x}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">
            No explainability data.
          </div>
        )}
      </div>

      {/* SIGNALS */}
      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">Signals</div>

        {signals.length === 0 ? (
          <div className="text-sm text-gray-500">No signals.</div>
        ) : (
          signals.map((s) => (
            <div
              key={s.code}
              className="border border-[#1E2A45] rounded-lg p-4 bg-[#0E1A3A]"
            >
              <div className="flex justify-between">
                <div className="text-white font-semibold">{s.code}</div>
                <div className="text-sm text-gray-300">
                  {s.severity} · +{s.score}
                </div>
              </div>

              <div className="mt-2 text-sm text-gray-300">
                {s.explanation}
              </div>

              {s.evidence && (
                <pre className="mt-3 text-xs text-gray-300 bg-[#121A33] border border-[#1E2A45] rounded p-3 overflow-auto">
{JSON.stringify(s.evidence, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>

      {/* TIMELINE — FACTS ONLY */}
      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">
          Incident Timeline
        </div>

        {timeline.length === 0 ? (
          <div className="text-sm text-gray-500">No timeline data.</div>
        ) : (
          <ul className="text-sm text-gray-300 space-y-2">
            {timeline.map((e: any, i: number) => (
              <li key={i}>
                • {e.type === "session"
                  ? `Session #${e.session_id} (${e.status})`
                  : `Incident created (${e.severity})`}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ACTIONS HISTORY (AUDIT) */}
<div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
  <div className="text-sm text-gray-400 font-semibold">
    SOC Actions History
  </div>

  {actions.length === 0 ? (
    <div className="text-sm text-gray-500">
      No actions recorded for this incident.
    </div>
  ) : (
    <ul className="text-sm text-gray-300 space-y-2">
      {actions.map((a) => (
        <li
          key={a.id}
          className="border border-[#1E2A45] rounded-lg p-3 bg-[#0E1A3A]"
        >
          <div className="flex justify-between">
            <span className="font-semibold text-white">
              {a.action}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(a.timestamp).toLocaleString()}
            </span>
          </div>

          <div className="text-xs text-gray-400 mt-1">
            by {a.user}
          </div>

          {a.details && (
            <pre className="mt-2 text-xs text-gray-300 bg-[#121A33] border border-[#1E2A45] rounded p-2 overflow-auto">
{JSON.stringify(a.details, null, 2)}
            </pre>
          )}
        </li>
      ))}
    </ul>
  )}
</div>
    </div>
  );
}


