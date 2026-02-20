import { API_URL } from "./config";
import { useAuth } from "../store/auth";


export interface SocSummaryIncident {
  incident_id: number;
  risk_score: number;
  severity: string;
  summary: string;
  user: string;
  system: string;
  ip: string | null;
  status: string;
  correlation_id: string;
  created_at: string | null;
}

export interface SocSummaryResponse {
  has_incident: boolean;
  incident: SocSummaryIncident | null;
}

export async function fetchSocSummary(): Promise<SocSummaryResponse> {
  const token = useAuth.getState().token;

  const res = await fetch(`${API_URL}/soc/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch SOC summary");
  }

  return res.json();
}