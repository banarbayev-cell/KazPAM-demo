import { api } from "@/services/api";

export type VNCAccessLaunchPayload = {
  break_glass_requested?: boolean;
  break_glass_reason?: string;
};

export type VNCAccessLaunchResponse = {
  target_id: number;
  target_name: string;
  target_host: string;
  target_port: number;
  protocol: "vnc";
  username?: string | null;
  approval_required: boolean;
  approval_grant_used: boolean;
  break_glass: boolean;
  launch_host: string;
  launch_port: number;
};

export async function launchVncAccess(
  targetId: number,
  payload: VNCAccessLaunchPayload = {}
): Promise<VNCAccessLaunchResponse> {
  return api.post<VNCAccessLaunchResponse>(
    `/vnc-access/targets/${targetId}/launch`,
    payload
  );
}