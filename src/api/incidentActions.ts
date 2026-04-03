import { API_URL } from "./config";
import { useAuth } from "../store/auth";

export type IncidentAction = {
  id: number;
  timestamp: string;
  action: string;
  user: string;
  details?: any;
};

function detailsContainIncidentId(details: any, incidentId: number) {
  const text =
    typeof details === "string"
      ? details
      : JSON.stringify(details ?? {});

  return (
    text.includes(`"incident_id": ${incidentId}`) ||
    text.includes(`"incident_id":${incidentId}`) ||
    text.includes(`\\"incident_id\\": ${incidentId}`) ||
    text.includes(`\\"incident_id\\":${incidentId}`)
  );
}

export async function fetchIncidentActions(incidentId: number) {
  const token = useAuth.getState().token;
  if (!token) throw new Error("No auth token");

  const res = await fetch(
    `${API_URL}/audit/logs?incident_id=${incidentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to load incident actions");
  }

  const data = (await res.json()) as IncidentAction[];

  return (Array.isArray(data) ? data : []).filter((item) => {
    const action = String(item?.action ?? "").toUpperCase();

    return (
      action.startsWith("INCIDENT_") ||
      action.startsWith("SOC_") ||
      detailsContainIncidentId(item?.details, incidentId)
    );
  });
}