import { api } from "@/services/api";
import type { Target } from "@/types/targets";
import type { TargetGroup } from "../types/targetGroups";

export interface RoleInventoryAccessOut {
  role?: {
    id: number;
    name: string;
  };
  direct_targets: Target[];
  target_groups: TargetGroup[];
  effective_targets: Target[];
}

export async function getRoleInventoryAccess(
  roleId: number
): Promise<RoleInventoryAccessOut> {
  return api.get<RoleInventoryAccessOut>(`/inventory-rbac/roles/${roleId}/access`);
}

export async function bindTargetToRole(
  roleId: number,
  targetId: number
): Promise<RoleInventoryAccessOut> {
  return api.post<RoleInventoryAccessOut>(
    `/inventory-rbac/roles/${roleId}/targets/${targetId}`
  );
}

export async function unbindTargetFromRole(
  roleId: number,
  targetId: number
): Promise<RoleInventoryAccessOut> {
  return api.delete<RoleInventoryAccessOut>(
    `/inventory-rbac/roles/${roleId}/targets/${targetId}`
  );
}

export async function bindTargetGroupToRole(
  roleId: number,
  groupId: number
): Promise<RoleInventoryAccessOut> {
  return api.post<RoleInventoryAccessOut>(
    `/inventory-rbac/roles/${roleId}/target-groups/${groupId}`
  );
}

export async function unbindTargetGroupFromRole(
  roleId: number,
  groupId: number
): Promise<RoleInventoryAccessOut> {
  return api.delete<RoleInventoryAccessOut>(
    `/inventory-rbac/roles/${roleId}/target-groups/${groupId}`
  );
}