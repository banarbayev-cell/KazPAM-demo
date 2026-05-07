import { API_URL } from "./config";
import { useAuth } from "../store/auth";

export type IncidentAction = {
  id: number;
  timestamp: string;
  action: string;
  user: string;
  details?: any;
};

function parseMaybeJson(value: any): any {
  if (value === null || value === undefined) return null;

  if (typeof value === "object") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    const first = JSON.parse(value);

    if (typeof first === "string") {
      try {
        return JSON.parse(first);
      } catch {
        return first;
      }
    }

    return first;
  } catch {
    return value;
  }
}

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
  const parsed = parseMaybeJson(details);

  if (parsed && typeof parsed === "object") {
    const rawIncidentId =
      parsed.incident_id ??
      parsed.incidentId ??
      parsed.incident?.id ??
      parsed.payload?.incident_id ??
      parsed.details?.incident_id ??
      null;

    const n = Number(rawIncidentId);

    if (Number.isFinite(n) && n === incidentId) {
      return true;
    }
  }

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

export async function fetchIncidentActions(
  incidentId: number
): Promise<IncidentAction[]> {
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
    .filter((item) => detailsContainIncidentId(item?.details, incidentId))
    .sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}