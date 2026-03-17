export type DiscoveryAccountStatus =
  | "discovered"
  | "reviewed"
  | "managed"
  | "ignored"
  | string;

export interface DiscoveredAccount {
  id: number;
  target_id: number;
  account_name: string;
  account_type: string | null;
  privilege_level: string | null;
  status: DiscoveryAccountStatus;

  owner?: string | null;
  notes?: string | null;
  linked_vault_secret_id?: number | null;
  linked_policy_id?: number | null;
}

export interface DiscoveryMetadataUpdatePayload {
  owner?: string | null;
  notes?: string | null;
  linked_vault_secret_id?: number | null;
  linked_policy_id?: number | null;
}

export interface DiscoveryTarget {
  id: number;
  name?: string | null;
  host?: string | null;
  hostname?: string | null;
  ip_address?: string | null;
  address?: string | null;
  port?: number | null;
  protocol?: string | null;
  target_type?: string | null;
  os_type?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DiscoveryJob {
  id: number;
  target_id?: number | null;
  status?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  discovered_count?: number | null;
  accounts_found?: number | null;
  summary?: string | null;
  error?: string | null;
}

export interface DiscoveryRunRequest {
  target_id: number;
}