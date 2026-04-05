import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useAuth } from "../store/auth";
import { fetchIncidentTimelineV3, TimelineV3 } from "../api/incidentsV3";
import { fetchIncidentActions, IncidentAction } from "../api/incidentActions";
import { fetchIncident, type IncidentItem } from "../api/incidents";
import { formatKzDateTime } from "../utils/time";
import {
  getIncidentRiskBarClass,
  getIncidentSeverityBadgeClass,
  getIncidentStatusBadgeClass,
} from "../utils/incidentUi";

function uebaBadge(level?: string) {
  const l = (level || "").toUpperCase();
  if (l === "CRITICAL") return "text-red-300 border-red-500/30";
  if (l === "HIGH") return "text-yellow-300 border-yellow-500/30";
  if (l === "MEDIUM") return "text-blue-300 border-blue-500/30";
  return "text-gray-200 border-[#1E2A45]";
}

function safeDate(value?: string | null) {
  return formatKzDateTime(value, {
    seconds: true,
    naiveInput: "utc",
  });
}

function copy(value: string) {
  if (!value || value === "—") return;
  navigator.clipboard.writeText(value);
}

function pivot(path: string, value: string, navigate: (path: string) => void) {
  if (!value || value === "—") return;
  navigate(`${path}?q=${encodeURIComponent(value)}`);
}

function geoFromIp(ip?: string) {
  if (!ip) return "Unknown";
  if (ip.startsWith("119.")) return "Vietnam";
  if (ip.startsWith("81.")) return "Russia";
  if (ip.startsWith("95.")) return "Kazakhstan";
  if (ip.startsWith("46.")) return "Kazakhstan";
  return "Unknown";
}

function asnFromIp(ip?: string) {
  if (!ip) return "Unknown ASN";
  if (ip.startsWith("119.")) return "VNPT";
  if (ip.startsWith("81.")) return "Ростелеком";
  if (ip.startsWith("95.")) return "Kazakhtelecom";
  if (ip.startsWith("46.")) return "Kazakhtelecom";
  return "Unknown";
}

function getEventTimeRaw(item: any) {
  return (
    item?.event_time ||
    item?.timestamp ||
    item?.start_time ||
    item?.created_at ||
    null
  );
}

function getEventTitle(item: any) {
  if (item?.title) return item.title;

  if (item?.type === "audit") {
    return item?.action || "Audit event";
  }

  if (item?.type === "session") {
    return `Session #${item?.session_id ?? "?"}`;
  }

  if (item?.type === "incident") {
    return `Incident #${item?.incident_id ?? "?"}`;
  }

  return "Event";
}

function getEventSubtitle(item: any) {
  if (item?.subtitle) return item.subtitle;

  if (item?.type === "audit") {
    return item?.user || "";
  }

  if (item?.type === "session") {
    return [item?.system, item?.status].filter(Boolean).join(" · ");
  }

  if (item?.type === "incident") {
    return item?.summary || "";
  }

  return "";
}

function getTimelineKey(item: any, index: number) {
  return [
    item?.type || "event",
    item?.incident_id ?? "",
    item?.session_id ?? "",
    item?.action ?? "",
    item?.timestamp ?? "",
    item?.event_time ?? "",
    index,
  ].join("-");
}

type MitreItem = {
  technique: string;
  name: string;
  why: string;
};

export default function IncidentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);

  const [incident, setIncident] = useState<IncidentItem | null>(null);
  const [timelineV3, setTimelineV3] = useState<TimelineV3 | null>(null);
  const [actions, setActions] = useState<IncidentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const incidentId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }, [id]);

  useEffect(() => {
    if (!token || !incidentId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchIncident(incidentId);
        setIncident(data);

        const [timelineResult, actionsResult] = await Promise.allSettled([
          fetchIncidentTimelineV3(incidentId),
          fetchIncidentActions(incidentId),
        ]);

        setTimelineV3(
          timelineResult.status === "fulfilled" ? timelineResult.value : null
        );

        setActions(
          actionsResult.status === "fulfilled" ? actionsResult.value : []
        );
      } catch (e: any) {
        setError(e?.message || "Failed to load incident");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [incidentId, token]);

  const ueba = timelineV3?.ueba;
  const signals = timelineV3?.signals || [];
  const timeline = timelineV3?.timeline || [];
  const incidentContext = (timelineV3 as any)?.incident_context || {};

  const displayedCreatedAt = useMemo(() => {
    return safeDate(incidentContext?.created_at ?? incident?.created_at) || "—";
  }, [incidentContext, incident]);

  const displayedClosedAt = useMemo(() => {
    return safeDate(incidentContext?.closed_at ?? incident?.closed_at) || null;
  }, [incidentContext, incident]);

  const attackStages = useMemo(() => {
    if (!incident) return [];

    const list: string[] = [];

    actions.forEach((a) => {
      const action = String(a.action || "").toUpperCase();

      if (action === "LOGIN_FAIL") list.push("Brute force");
      if (action === "LOGIN_SUCCESS") list.push("Credential access");
      if (action === "LOGIN_RISK_POST_AUTH") list.push("Account takeover");
      if (action === "PASSWORD_CHANGED") list.push("Credential rotation");
      if (action === "USER.PASSWORD_RESET") list.push("Password reset");

      if (action === "USER.PASSWORD_RESET" || action === "PASSWORD_CHANGED") {
        list.push("Recovery / rotation");
      }
    });

    if ((incident.correlation_id || "").toLowerCase().includes("auth_compromise")) {
      list.push("Compromise correlation");
    }

    return [...new Set(list)];
  }, [actions, incident]);

  const mitre = useMemo<MitreItem[]>(() => {
    if (!incident) return [];

    const out: MitreItem[] = [];

    const add = (technique: string, name: string, why: string) => {
      const key = `${technique}|${name}`;
      if (!out.some((x) => `${x.technique}|${x.name}` === key)) {
        out.push({ technique, name, why });
      }
    };

    const explain = (timelineV3 as any)?.ueba?.explain || [];

    explain.forEach((line: string) => {
      const l = (line || "").toLowerCase();

      if (l.includes("privileged user") || l.includes("admin")) {
        add("T1078", "Valid Accounts", "Privileged account involvement");
      }

      if (l.includes("correlation")) {
        add(
          "T1589",
          "Gather Victim Identity Information",
          "Correlation suggests reused identity/device context"
        );
      }
    });

    const actionSet = new Set(actions.map((a) => String(a.action || "").toUpperCase()));

    if (actionSet.has("LOGIN_FAIL")) {
      add("T1110", "Brute Force", "Multiple failed login attempts observed");
    }

    if (actionSet.has("LOGIN_SUCCESS") && actionSet.has("LOGIN_FAIL")) {
      add("T1078", "Valid Accounts", "Successful authentication after failures");
    }

    if (actionSet.has("PASSWORD_CHANGED") || actionSet.has("USER.PASSWORD_RESET")) {
      add(
        "T1098",
        "Account Manipulation",
        "Password change / reset activity recorded"
      );
    }

    if (actionSet.has("LOGIN_RISK_POST_AUTH")) {
      add(
        "T1556",
        "Modify Authentication Process",
        "Post-auth risk stage indicates suspicious auth context"
      );
    }

    return out;
  }, [actions, timelineV3, incident]);

  const ioc = useMemo(() => {
    if (!incident) {
      return {
        ip: "—",
        user: "—",
        system: "—",
        fingerprint: "—",
        correlation_id: "—",
      };
    }

    const ip = incidentContext?.source_ip || incident.ip || "—";
    const user = incidentContext?.user || incident.user || "—";
    const system = incidentContext?.system || incident.system || "—";
    const fingerprint =
      incidentContext?.fingerprint || incident.correlation_id || "—";

    return {
      ip,
      user,
      system,
      fingerprint,
      correlation_id: incident.correlation_id || "—",
    };
  }, [incident, incidentContext]);

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Loading incident…</div>;
  }

  if (error || !incident) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-red-400">{error || "Incident not found"}</div>
        <button
          onClick={() => navigate("/soc/incidents")}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back to Incidents
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 space-y-8 text-[#0A0F24]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A0F24]">
            Incident #{incident.id}
          </h1>

          <div className="mt-2 text-sm text-gray-600">
            Created: {displayedCreatedAt}
            {displayedClosedAt ? <> · Closed: {displayedClosedAt}</> : <> · Closed: —</>}
          </div>
        </div>

        <button
          onClick={() => navigate("/soc/incidents")}
          className="px-4 py-2 rounded-lg border border-[#D7DEED] bg-white text-sm text-[#0A0F24] hover:bg-gray-50"
        >
          ← Back to Incidents
        </button>
      </div>

      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-sm text-gray-400">Status</div>
          <div className="mt-1">
            <span
              className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${getIncidentStatusBadgeClass(
                incident.status
              )}`}
            >
              {incident.status}
            </span>
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-400">Severity</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-lg font-semibold text-white">{incident.severity}</div>
            <span
              className={`px-2 py-1 text-xs rounded border ${getIncidentSeverityBadgeClass(
                incident.severity
              )}`}
            >
              {incident.severity}
            </span>
          </div>
        </div>

        <div className="col-span-2">
          <div className="text-sm text-gray-400 mb-1">Risk score</div>

          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold text-white">
              {incident.risk_score}
            </div>

            <div className="flex-1 h-3 bg-[#0E1A3A] rounded-full overflow-hidden border border-[#1E2A45]">
              <div
                className={`h-full ${getIncidentRiskBarClass(incident.risk_score)}`}
                style={{
                  width: `${Math.max(0, Math.min(100, incident.risk_score))}%`,
                }}
              />
            </div>

            <div className="text-xs text-gray-400 w-[120px] text-right">
              LOW · MED · HIGH · CRIT
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="text-sm text-gray-400">Correlation ID</div>
          <div className="text-sm text-white break-all">
            {incident.correlation_id || "—"}
          </div>
        </div>
      </div>

      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">Context</div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400">User</div>
            <div className="text-white">{incidentContext?.user || incident.user || "—"}</div>
          </div>

          <div>
            <div className="text-gray-400">System</div>
            <div className="text-white">{incidentContext?.system || incident.system || "—"}</div>
          </div>

          <div>
            <div className="text-gray-400">Source IP</div>
            <div className="text-white">{incidentContext?.source_ip || incident.ip || "Unknown"}</div>
          </div>

          <div className="col-span-3">
            <div className="text-gray-400">Device</div>
            <div className="text-white break-all">
              {incidentContext?.user_agent || "Unknown"}
            </div>
          </div>
        </div>

        {incident.summary && (
          <div className="pt-4 text-sm text-gray-300">{incident.summary}</div>
        )}
      </div>

      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">
          Indicators of Compromise
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Source IP</div>
            <div className="flex items-center gap-2 text-white break-all">
              {ioc.ip}
              <button
                onClick={() => copy(ioc.ip)}
                className="text-xs text-gray-400 hover:text-white"
              >
                copy
              </button>
              <button
                onClick={() => pivot("/soc/incidents", ioc.ip, navigate)}
                className="text-xs text-blue-400 hover:text-blue-200"
              >
                investigate
              </button>
            </div>
          </div>

          <div>
            <div className="text-gray-400">Target User</div>
            <div className="flex items-center gap-2 text-white">
              {ioc.user}
              <button
                onClick={() => copy(ioc.user)}
                className="text-xs text-gray-400 hover:text-white"
              >
                copy
              </button>
            </div>
          </div>

          <div>
            <div className="text-gray-400">System</div>
            <div className="flex items-center gap-2 text-white">
              {ioc.system}
              <button
                onClick={() => copy(ioc.system)}
                className="text-xs text-gray-400 hover:text-white"
              >
                copy
              </button>
            </div>
          </div>

          <div className="col-span-3">
            <div className="text-gray-400">Correlation fingerprint</div>
            <div className="flex items-center gap-2 text-xs text-white break-all">
              {ioc.fingerprint}
              <button
                onClick={() => copy(ioc.fingerprint)}
                className="text-xs text-gray-400 hover:text-white"
              >
                copy
              </button>
              <button
                onClick={() => pivot("/soc/incidents", ioc.fingerprint, navigate)}
                className="text-xs text-blue-400 hover:text-blue-200"
              >
                investigate
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">IP Intelligence</div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400">IP</div>
            <div className="text-white">{ioc.ip}</div>
          </div>

          <div>
            <div className="text-gray-400">Geo</div>
            <div className="text-white">{geoFromIp(ioc.ip)}</div>
          </div>

          <div>
            <div className="text-gray-400">ASN</div>
            <div className="text-white">{asnFromIp(ioc.ip)}</div>
          </div>
        </div>
      </div>

      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">Threat Graph</div>

        <div className="overflow-x-auto">
          <svg width="700" height="120">
            <line x1="80" y1="60" x2="220" y2="60" stroke="#2A3A5A" strokeWidth="2" />
            <line x1="300" y1="60" x2="440" y2="60" stroke="#2A3A5A" strokeWidth="2" />
            <line x1="520" y1="60" x2="660" y2="60" stroke="#2A3A5A" strokeWidth="2" />

            <rect x="0" y="40" width="160" height="40" rx="6" fill="#0E1A3A" stroke="#1E2A45" />
            <text x="80" y="65" textAnchor="middle" fill="white" fontSize="12">
              {ioc.user}
            </text>

            <rect x="160" y="40" width="160" height="40" rx="6" fill="#0E1A3A" stroke="#1E2A45" />
            <text x="240" y="65" textAnchor="middle" fill="white" fontSize="12">
              {ioc.ip}
            </text>

            <rect x="320" y="40" width="160" height="40" rx="6" fill="#0E1A3A" stroke="#1E2A45" />
            <text x="400" y="65" textAnchor="middle" fill="white" fontSize="12">
              {ioc.system}
            </text>

            <rect x="480" y="40" width="180" height="40" rx="6" fill="#0E1A3A" stroke="#1E2A45" />
            <text x="570" y="65" textAnchor="middle" fill="white" fontSize="12">
              Incident #{incident.id}
            </text>
          </svg>
        </div>
      </div>

      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">MITRE ATT&CK</div>

        {mitre.length === 0 ? (
          <div className="text-sm text-gray-500">No ATT&CK techniques mapped.</div>
        ) : (
          <div className="space-y-2">
            {mitre.map((m) => (
              <div
                key={`${m.technique}-${m.name}`}
                className="border border-[#1E2A45] rounded-lg p-3 bg-[#0E1A3A]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-white font-semibold">
                    {m.technique} · {m.name}
                  </div>
                  <span className="text-xs text-gray-300">UI-only mapping</span>
                </div>
                <div className="mt-1 text-xs text-gray-400">{m.why}</div>
              </div>
            ))}
          </div>
        )}
      </div>

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
              expand: {(timelineV3 as any)?.window_minutes?.sessions_expand ?? "—"}m ·
              fallback: {(timelineV3 as any)?.window_minutes?.fallback_around_incident ?? "—"}m
            </div>
          </div>
        </div>

        {(ueba as any)?.explain?.length ? (
          <ul className="pt-2 text-sm text-gray-400 space-y-1">
            {(ueba as any).explain.map((x: string) => (
              <li key={x}>• {x}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">No explainability data.</div>
        )}
      </div>

      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">Signals</div>

        {signals.length === 0 ? (
          <div className="text-sm text-gray-500">No signals.</div>
        ) : (
          signals.map((s: any) => (
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

              <div className="mt-2 text-sm text-gray-300">{s.explanation}</div>

              {s.evidence && (
                <pre className="mt-3 text-xs text-gray-300 bg-[#121A33] border border-[#1E2A45] rounded p-3 overflow-auto">
{JSON.stringify(s.evidence, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">Attack chain</div>

        {attackStages.length === 0 ? (
          <div className="text-sm text-gray-500">No attack stages detected.</div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {attackStages.map((s, i) => (
              <div
                key={`${s}-${i}`}
                className="px-3 py-1 text-xs rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">Incident Timeline</div>

        {timeline.length === 0 ? (
          <div className="text-sm text-gray-500">No timeline data.</div>
        ) : (
          <div className="space-y-3">
            {timeline.map((e: any, i: number) => {
              const timeRaw = getEventTimeRaw(e);
              const title = getEventTitle(e);
              const subtitle = getEventSubtitle(e);

              return (
                <div
                  key={getTimelineKey(e, i)}
                  className="border border-[#1E2A45] rounded-lg p-3 bg-[#0E1A3A]"
                >
                  <div className="text-xs text-gray-400">
                    {safeDate(timeRaw) || "—"}
                  </div>

                  <div className="mt-1 text-sm font-semibold text-white">
                    {title}
                  </div>

                  {subtitle ? (
                    <div className="mt-1 text-xs text-gray-300">{subtitle}</div>
                  ) : null}

                  {e?.type === "audit" && e?.meta?.ip ? (
                    <div className="mt-2 text-xs text-gray-400">
                      IP: {e.meta.ip}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border border-[#1E2A45] rounded-xl bg-[#121A33] p-6 space-y-4">
        <div className="text-sm text-gray-400 font-semibold">
          Audit & Response History
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
                <div className="flex justify-between gap-4">
                  <span className="font-semibold text-white">{a.action}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {safeDate(a.timestamp)}
                  </span>
                </div>

                <div className="text-xs text-gray-400 mt-1">by {a.user}</div>

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