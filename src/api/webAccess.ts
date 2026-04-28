import { api } from "@/services/api";

export type WebAccessLaunchPayload = {
  break_glass_requested?: boolean;
  break_glass_reason?: string;
};

export type WebAccessLaunchResponse = {
  session_id: number;
  target_id: number;
  target_name: string;
  target_host: string;
  target_port: number;
  protocol: "https";
  launch_url: string;
  approval_required: boolean;
  approval_grant_used: boolean;
  break_glass: boolean;
};

export async function launchWebAccess(
  targetId: number,
  payload: WebAccessLaunchPayload = {}
): Promise<WebAccessLaunchResponse> {
  return api.post<WebAccessLaunchResponse>(
    `/web-access/targets/${targetId}/launch`,
    payload
  );
}