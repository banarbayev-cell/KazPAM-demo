import { api } from "@/services/api";

export type DBAccessLaunchPayload = {
  break_glass_requested?: boolean;
  break_glass_reason?: string;
};

export type DBAccessLaunchResponse = {
  session_id: number;
  target_id: number;
  target_name: string;
  target_host: string;
  target_port: number;
  protocol: "mssql";
  username?: string | null;
  database?: string | null;
  approval_required: boolean;
  approval_grant_used: boolean;
  break_glass: boolean;
  connection_string_stub: string;
};

export async function launchDbAccess(
  targetId: number,
  payload: DBAccessLaunchPayload = {}
): Promise<DBAccessLaunchResponse> {
  return api.post<DBAccessLaunchResponse>(
    `/db-access/targets/${targetId}/launch`,
    payload
  );
}