import { api } from "@/services/api";

export interface RDPSessionStartPayload {
  target_id: number;
}

export interface RDPSessionStartResponse {
  id: number;
  user_id: number;
  target_id: number | null;
  vault_secret_id: number | null;
  protocol: string;
  status: string;
  target_host: string;
  target_port: number;
  target_username?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  expires_at: string;
  client_ip?: string | null;
  gateway_node?: string | null;
  recording_path?: string | null;
  details?: string | null;
  created_at: string;
  updated_at: string;
  grant_token: string;
}

export async function startRdpSession(
  payload: RDPSessionStartPayload
): Promise<RDPSessionStartResponse> {
  return api.post<RDPSessionStartResponse>("/rdp/sessions/start", payload);
}