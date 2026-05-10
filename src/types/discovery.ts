export type DiscoveryAccountStatus =
  | "discovered"
  | "reviewed"
  | "managed"
  | "ignored"
  | string;

export interface DiscoveredAccount {
  id: number;
  target_id: number;
  last_job_id?: number | null;

  account_name: string;
  account_type: string | null;
  privilege_level: string | null;

  uid?: number | null;
  shell?: string | null;
  home_dir?: string | null;
  groups_json?: string | null;
  has_authorized_keys?: boolean | null;

  status: DiscoveryAccountStatus;
  source?: string | null;

  owner?: string | null;
  notes?: string | null;
  linked_vault_secret_id?: number | null;
  linked_policy_id?: number | null;

  last_seen_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DiscoveryMetadataUpdatePayload {
  owner?: string | null;
  notes?: string | null;
  linked_vault_secret_id?: number | null;
  linked_policy_id?: number | null;
}

export interface DiscoveryTarget {
  id: number;
  name: string;
  host: string;
  port: number;

  os_type: string;
  protocol: string;

  username: string;
  vault_secret_id?: number | null;

  is_active: boolean;
  description?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  // backward-compatible aliases for old UI code
  hostname?: string | null;
  ip_address?: string | null;
  address?: string | null;
  target_type?: string | null;
  status?: string | null;
}

export interface DiscoveryTargetCreatePayload {
  name: string;
  host: string;
  port: number;
  os_type: "linux";
  protocol: "ssh";
  username: string;
  vault_secret_id?: number | null;
  is_active: boolean;
  description?: string | null;
}

export interface DiscoveryTargetUpdatePayload {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  vault_secret_id?: number | null;
  is_active?: boolean;
  description?: string | null;
}

export interface DiscoveryJob {
  id: number;

  mode?: string | null;
  status?: string | null;

  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  total_targets?: number | null;
  total_accounts?: number | null;
  total_errors?: number | null;

  details?: string | null;
  created_by?: string | null;

  // old UI compatibility
  target_id?: number | null;
  discovered_count?: number | null;
  accounts_found?: number | null;
  summary?: string | null;
  error?: string | null;
}

export interface DiscoveryRunRequest {
  target_ids: number[];
}