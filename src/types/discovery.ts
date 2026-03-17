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