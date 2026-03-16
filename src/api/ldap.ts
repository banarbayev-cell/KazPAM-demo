import { api } from "@/services/api";

export interface LdapRoleMapping {
  id: number;
  group_dn: string;
  role_name: string;
  is_enabled: boolean;
}

export interface LdapSyncResult {
  status: string;
  email: string;
  created: boolean;
  updated: boolean;
  skipped: boolean;
  roles: string[];
  details?: any;
}

export interface LdapSyncLog {
  id: number;
  started_at: string;
  finished_at?: string | null;
  status: string;
  mode: string;
  target_email?: string | null;
  total_found: number;
  total_created: number;
  total_updated: number;
  total_skipped: number;
  details?: string | null;
}

export const ldapApi = {
  test: async (payload: Record<string, any> = {}) => {
    return api.post("/ldap/test", payload);
  },

  listMappings: async (): Promise<LdapRoleMapping[]> => {
    return api.get("/ldap/mappings");
  },

  upsertMapping: async (payload: {
    group_dn: string;
    role_name: string;
    is_enabled?: boolean;
  }): Promise<LdapRoleMapping> => {
    return api.post("/ldap/mappings", payload);
  },

  deleteMapping: async (id: number) => {
    return api.delete(`/ldap/mappings/${id}`);
  },

  syncUser: async (email: string): Promise<LdapSyncResult> => {
    return api.post("/ldap/sync/user", { email });
  },

  dryRunSyncUser: async (email: string): Promise<LdapSyncResult> => {
    return api.post("/ldap/sync/user/dry-run", { email });
  },

  listSyncLogs: async (): Promise<LdapSyncLog[]> => {
    return api.get("/ldap/sync/logs");
  },
};