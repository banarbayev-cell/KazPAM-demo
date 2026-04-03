// src/api/incidents.ts
import { api } from "../services/api";

export type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED" | "ESCALATED";
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface IncidentItem {
  id: number;
  correlation_id?: string | null;

  status: IncidentStatus;
  severity: IncidentSeverity | string;
  risk_score: number;

  user: string;
  system: string;
  ip: string;

  summary?: string | null;
  details?: any;

  created_at: string;
  closed_at?: string | null;
}

export async function fetchIncidents(params?: {
  status?: string;
  severity?: string;
  q?: string;
}) {
  const qs = new URLSearchParams();

  if (params?.status && params.status !== "all") {
    qs.set("status", params.status);
  }

  if (params?.severity && params.severity !== "all") {
    qs.set("severity", params.severity);
  }

  if (params?.q?.trim()) {
    qs.set("q", params.q.trim());
  }

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return api.get<IncidentItem[]>(`/incidents/${suffix}`);
}

export async function fetchIncident(incidentId: number) {
  return api.get<IncidentItem>(`/incidents/${incidentId}`);
}

export async function updateIncidentStatus(
  incidentId: number,
  status: IncidentStatus
) {
  return api.patch<IncidentItem>(`/incidents/${incidentId}/status`, { status });
}