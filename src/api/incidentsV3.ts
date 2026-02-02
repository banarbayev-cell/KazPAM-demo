// src/api/incidentsV3.ts
import { API_URL } from "./config";
import { useAuth } from "../store/auth";

export type TimelineV3 = {
  incident_id: number;
  correlation_id?: string | null;
  window_minutes?: {
    sessions_expand?: number;
    fallback_around_incident?: number;
  };
  signals?: Array<{
    code: string;
    severity: string;
    score: number;
    explanation: string;
    evidence?: any;
  }>;
  ueba?: {
    score: number;
    level: string;
    signals_count: number;
    explain?: string[];
  };
  timeline?: any[];
};

export async function fetchIncidentTimelineV3(incidentId: number) {
  const token = useAuth.getState().token;

  if (!token) throw new Error("No auth token found");

  const res = await fetch(`${API_URL}/incidents/${incidentId}/timeline/v3`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load timeline v3: ${text}`);
  }

  return (await res.json()) as TimelineV3;
}
