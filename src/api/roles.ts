import { api } from "@/services/api";

export type RoleLite = {
  id: number;
  name: string;
  policies?: unknown[];
  permissions?: unknown[];
};

export async function listRoles(): Promise<RoleLite[]> {
  return api.get<RoleLite[]>("/roles/");
}

export async function getRole(roleId: number): Promise<RoleLite> {
  return api.get<RoleLite>(`/roles/${roleId}`);
}

export async function deleteRole(roleId: number): Promise<{ message?: string }> {
  return api.delete<{ message?: string }>(`/roles/${roleId}`);
}