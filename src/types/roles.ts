export type UserRole = "superadmin" | "admin" | "auditor" | "viewer";

export const rolePermissions: Record<UserRole, string[]> = {
  superadmin: ["managePolicies", "manageUsers", "viewAudit", "viewSessions"],
  admin: ["managePolicies", "manageUsers"],
  auditor: ["viewAudit"],
  viewer: [],
};
