import { api } from "@/services/api";
import type {
  Target,
  TargetCreatePayload,
  TargetUpdatePayload,
  TargetVaultBindingOut,
  TargetProtocol,
} from "@/types/targets";

export async function listTargets(): Promise<Target[]> {
  return api.get<Target[]>("/targets/");
}

export async function getTarget(targetId: number): Promise<Target> {
  return api.get<Target>(`/targets/${targetId}`);
}

export async function createTarget(payload: TargetCreatePayload): Promise<Target> {
  return api.post<Target>("/targets/", payload);
}

export async function updateTarget(
  targetId: number,
  payload: TargetUpdatePayload
): Promise<Target> {
  return api.patch<Target>(`/targets/${targetId}`, payload);
}

export async function bindTargetVaultSecret(
  targetId: number,
  secretId: number
): Promise<TargetVaultBindingOut> {
  return api.post<TargetVaultBindingOut>(`/targets/${targetId}/vault-binding`, {
    secret_id: secretId,
  });
}

export async function unbindTargetVaultSecret(
  targetId: number
): Promise<TargetVaultBindingOut> {
  return api.delete<TargetVaultBindingOut>(`/targets/${targetId}/vault-binding`);
}

export async function listAccessibleTargets(
  protocol?: "ssh" | "rdp" | "https" | "mssql" | "vnc"
): Promise<Target[]> {
  const query = protocol ? `?protocol=${protocol}` : "";
  return api.get<Target[]>(`/targets/accessible${query}`);
}

export async function deleteTarget(
  targetId: number
): Promise<{ ok: boolean }> {
  return api.delete<{ ok: boolean }>(`/targets/${targetId}`);
}