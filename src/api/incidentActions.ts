import { API_URL } from "./config";
import { useAuth } from "../store/auth";

export type IncidentAction = {
  id: number;
  timestamp: string;
  action: string;
  user: string;
  details?: any;
};

const RELATED_PREFIXES = [
  "INCIDENT_",
  "SOC_",
  "LOGIN_",
  "PASSWORD_",
  "AUTH_",
  "MFA_",
  "SESSION_",
  "RDP_SESSION_",
  "SSH_SESSION_",
  "BREAK_GLASS_",
];

function stringifyDetails(details: any) {
  if (typeof details === "string") {
    return details;
  }

  try {
    return JSON.stringify(details ?? {});
  } catch {
    return "";
  }
}

function detailsContainIncidentId(details: any, incidentId: number) {
  const text = stringifyDetails(details);

  return (
    text.includes(`"incident_id": ${incidentId}`) ||
    text.includes(`"incident_id":${incidentId}`) ||
    text.includes(`\\"incident_id\\": ${incidentId}`) ||
    text.includes(`\\"incident_id\\":${incidentId}`) ||
    text.includes(`'incident_id': ${incidentId}`) ||
    text.includes(`'incident_id':${incidentId}`)
  );
}

function isIncidentRelatedAction(actionRaw: string) {
  const action = String(actionRaw || "").toUpperCase();

  if (action === "USER.PASSWORD_RESET") {
    return true;
  }

  return RELATED_PREFIXES.some((prefix) => action.startsWith(prefix));
}

export async function fetchIncidentActions(incidentId: number) {
  const token = useAuth.getState().token;
  if (!token) throw new Error("No auth token");

  const res = await fetch(`${API_URL}/audit/logs?incident_id=${incidentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load incident actions");
  }

  const data = (await res.json()) as IncidentAction[];

  return (Array.isArray(data) ? data : [])
    .filter((item) => {
      return (
        detailsContainIncidentId(item?.details, incidentId) ||
        isIncidentRelatedAction(item?.action)
      );
    })
    .sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}