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

export interface InventoryAccessUser {
  id: number;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  is_active?: boolean;
}

export interface InventoryAccessRole {
  id: number;
  name: string;
}

export interface UserInventoryAccessOut {
  user: InventoryAccessUser;
  roles: InventoryAccessRole[];
  direct_targets: Target[];
  effective_targets: Target[];
}

export interface TargetInventoryAccessSummary {
  target: Target;
  direct_users: InventoryAccessUser[];
  direct_roles: InventoryAccessRole[];
  inherited_roles: InventoryAccessRole[];
}

function normalizeUsersPayload(payload: any): InventoryAccessUser[] {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.users)) return payload.users;
    if (Array.isArray(payload.data)) return payload.data;
  }

  return [];
}

/* =========================
   ROLE ACCESS
========================= */

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

/* =========================
   USER ACCESS
========================= */

export async function getUserInventoryAccess(
  userId: number
): Promise<UserInventoryAccessOut> {
  return api.get<UserInventoryAccessOut>(`/inventory-rbac/users/${userId}/access`);
}

export async function bindTargetToUser(
  userId: number,
  targetId: number
): Promise<UserInventoryAccessOut> {
  return api.post<UserInventoryAccessOut>(
    `/inventory-rbac/users/${userId}/targets/${targetId}`
  );
}

export async function unbindTargetFromUser(
  userId: number,
  targetId: number
): Promise<UserInventoryAccessOut> {
  return api.delete<UserInventoryAccessOut>(
    `/inventory-rbac/users/${userId}/targets/${targetId}`
  );
}

/* =========================
   TARGET ACCESS SUMMARY
========================= */

export async function getTargetInventoryAccess(
  targetId: number
): Promise<TargetInventoryAccessSummary> {
  return api.get<TargetInventoryAccessSummary>(
    `/inventory-rbac/targets/${targetId}/access`
  );
}

/* =========================
   SUPPORT
========================= */

export async function listUsersForTargetAccess(): Promise<InventoryAccessUser[]> {
  const payload = await api.get<any>("/users/");
  return normalizeUsersPayload(payload);
}