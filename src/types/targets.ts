export type TargetProtocol = "ssh" | "rdp" | "https" | "mssql";

export type SSHAuthMode =
  | "gateway_key"
  | "vault_password"
  | "vault_private_key";

export interface Target {
  id: number;
  name: string;
  host: string;
  port: number;
  os_type: string;
  protocol: TargetProtocol;
  ssh_auth_mode: SSHAuthMode;
  username?: string | null;
  vault_secret_id?: number | null;
  requires_vault_secret: boolean;
  approval_required: boolean;

  break_glass_enabled: boolean;
  break_glass_ttl_minutes: number;
  break_glass_requires_reason: boolean;

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
  protocol: TargetProtocol;
  ssh_auth_mode: SSHAuthMode;
  username?: string;
  requires_vault_secret: boolean;
  approval_required: boolean;

  break_glass_enabled: boolean;
  break_glass_ttl_minutes: number;
  break_glass_requires_reason: boolean;

  gateway_node?: string;
  is_active: boolean;
  description?: string;
}

export interface TargetUpdatePayload {
  name?: string;
  host?: string;
  port?: number;
  os_type?: string;
  protocol?: TargetProtocol;
  ssh_auth_mode?: SSHAuthMode;
  username?: string;
  requires_vault_secret?: boolean;
  approval_required?: boolean;

  break_glass_enabled?: boolean;
  break_glass_ttl_minutes?: number;
  break_glass_requires_reason?: boolean;

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