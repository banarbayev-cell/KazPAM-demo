import { API_URL } from "./config";
import { useAuth } from "../store/auth";

export type IncidentAction = {
  id: number;
  timestamp: string;
  action: string;
  user: string;
  details?: any;
};

export async function fetchIncidentActions(incidentId: number) {
  const token = useAuth.getState().token;
  if (!token) throw new Error("No auth token");

  const res = await fetch(
    `${API_URL}/audit/logs?category=incident&incident_id=${incidentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to load incident actions");
  }

  return (await res.json()) as IncidentAction[];
}
