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
  listMappings: async (): Promise<LdapRoleMapping[]> => {
    return api.get("/settings/integrations/ad/mappings");
  },

  upsertMapping: async (payload: {
    group_dn: string;
    role_name: string;
    is_enabled?: boolean;
  }): Promise<LdapRoleMapping> => {
    return api.post("/settings/integrations/ad/mappings", payload);
  },

  updateMapping: async (
    id: number,
    payload: {
      group_dn?: string;
      role_name?: string;
      is_enabled?: boolean;
    }
  ): Promise<LdapRoleMapping> => {
    return api.patch(`/settings/integrations/ad/mappings/${id}`, payload);
  },

  deleteMapping: async (id: number) => {
    return api.delete(`/settings/integrations/ad/mappings/${id}`);
  },

  syncUser: async (email: string): Promise<LdapSyncResult> => {
    return api.post("/settings/integrations/ad/sync", { email });
  },

  dryRunSyncUser: async (email: string): Promise<LdapSyncResult> => {
    return api.post("/settings/integrations/ad/dry-run", { email });
  },

  listSyncLogs: async (): Promise<LdapSyncLog[]> => {
    return api.get("/settings/integrations/ad/sync-history");
  },
};