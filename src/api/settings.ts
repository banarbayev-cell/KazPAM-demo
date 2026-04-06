import { API_URL } from "./config";

export interface Settings {
  system_name: string;
  language: string;
  environment?: string;
  timezone?: string;

  mfa_required: boolean;
  password_rotation_days: number;
  lockout_attempts: number;
  session_limit_default: number;

  ad_enabled: boolean;
  ad_host?: string;
  ad_port: number;
  ad_base_dn?: string;
  ad_bind_dn?: string;
  ad_use_ssl: boolean;

  ad_user_search_base?: string;
  ad_group_search_base?: string;
  ad_default_role?: string;
  ad_jit_enabled?: boolean;
  ad_require_mapped_role?: boolean;

  ad_bind_password_configured?: boolean;

  siem_webhook_url?: string;

  // NEW
  siem_auth_type?: string | null;
  siem_auth_token_configured?: boolean;
  siem_headers_json?: string | null;

  siem_last_test_at?: string | null;
  siem_last_success_at?: string | null;
  siem_last_delivery_attempt_at?: string | null;
  siem_last_delivery_status?: string | null;
  siem_last_error?: string | null;

  radius_enabled: boolean;
  radius_secret_configured?: boolean;
}

export interface SettingsIntegrationsPayload {
  ad_enabled?: boolean;
  ad_host?: string;
  ad_port?: number;
  ad_base_dn?: string;
  ad_bind_dn?: string;
  ad_bind_password?: string;
  ad_use_ssl?: boolean;

  ad_user_search_base?: string;
  ad_group_search_base?: string;
  ad_default_role?: string;
  ad_jit_enabled?: boolean;
  ad_require_mapped_role?: boolean;

  siem_webhook_url?: string;

  // NEW
  siem_auth_type?: string | null;
  siem_auth_token?: string;
  siem_headers_json?: string | null;

  radius_enabled?: boolean;
  radius_secret?: string;
}

export interface ADTestPayload {
  host?: string;
  port?: number;
  bind_dn?: string;
  bind_password?: string;
  base_dn?: string;
  use_ssl?: boolean;
}

export interface SIEMTestResponse {
  status: "success" | "failed" | string;
  http_status?: number;
  message?: string;
  last_test_at?: string | null;
  last_success_at?: string | null;
  last_delivery_status?: string | null;
  last_error?: string | null;
}

const getHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const settingsApi = {
  get: async (): Promise<Settings> => {
    const res = await fetch(`${API_URL}/settings`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!res.ok) throw new Error("Не удалось загрузить настройки");
    return res.json();
  },

  updateGeneral: async (data: Partial<Settings>) => {
    const res = await fetch(`${API_URL}/settings/general`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Ошибка обновления общих настроек");
    return json;
  },

  updateSecurity: async (data: Partial<Settings>) => {
    const res = await fetch(`${API_URL}/settings/security`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Ошибка обновления безопасности");
    return json;
  },

  updateIntegrations: async (data: SettingsIntegrationsPayload) => {
    const res = await fetch(`${API_URL}/settings/integrations`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Ошибка обновления интеграций");
    return json;
  },

  testAd: async (data: ADTestPayload) => {
    const res = await fetch(`${API_URL}/settings/integrations/ad/test`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Ошибка соединения с AD");
    return json;
  },

  testSiem: async (webhook_url?: string): Promise<SIEMTestResponse> => {
    const res = await fetch(`${API_URL}/settings/integrations/siem/test`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ webhook_url }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Ошибка теста SIEM");
    return json;
  },
};