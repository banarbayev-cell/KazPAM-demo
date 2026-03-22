export interface Target {
  id: number;
  name: string;
  host: string;
  port: number;
  os_type: string;
  protocol: string;
  username?: string | null;
  vault_secret_id?: number | null;
  requires_vault_secret: boolean;
  approval_required: boolean;
  gateway_node?: string | null;
  is_active: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TargetCreatePayload {
  name: string;
  host: string;
  port: number;
  os_type: string;
  protocol: string;
  username?: string;
  requires_vault_secret: boolean;
  approval_required: boolean;
  gateway_node?: string;
  is_active: boolean;
  description?: string;
}

export interface TargetUpdatePayload {
  name?: string;
  host?: string;
  port?: number;
  os_type?: string;
  protocol?: string;
  username?: string;
  requires_vault_secret?: boolean;
  approval_required?: boolean;
  gateway_node?: string;
  is_active?: boolean;
  description?: string;
}

export interface TargetVaultBindingOut {
  target_id: number;
  target_name: string;
  vault_secret_id?: number | null;
  vault_system?: string | null;
  vault_login?: string | null;
  vault_type?: string | null;
}
2) Новый файл
C:\Users\user\Documents\KazPAM-dashboard\src\api\targets.ts
import { api } from "@/services/api";
import type {
  Target,
  TargetCreatePayload,
  TargetUpdatePayload,
  TargetVaultBindingOut,
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