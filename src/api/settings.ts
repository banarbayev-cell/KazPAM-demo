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
  ad_verify_cert?: boolean;
  ad_ca_cert_configured?: boolean;

  ad_user_search_base?: string;
  ad_group_search_base?: string;
  ad_default_role?: string;
  ad_jit_enabled?: boolean;
  ad_require_mapped_role?: boolean;
  ad_bind_password_configured?: boolean;

  siem_webhook_url?: string;
  siem_transport?: "webhook" | "syslog" | string;
  siem_syslog_host?: string | null;
  siem_syslog_port?: number;
  siem_syslog_protocol?: "udp" | "tcp" | string;
  siem_syslog_format?: "json" | "cef" | "leef" | string;
  siem_syslog_facility?: string | null;

  siem_auth_type?: string | null;
  siem_auth_token_configured?: boolean;
  siem_headers_json?: string | null;

  siem_last_test_at?: string | null;
  siem_last_success_at?: string | null;
  siem_last_delivery_attempt_at?: string | null;
  siem_last_delivery_status?: string | null;
  siem_last_error?: string | null;
  siem_last_delivery_operation?: string | null;
  siem_last_exported_events?: number | null;

  radius_enabled: boolean;
  radius_secret_configured?: boolean;
  radius_host?: string | null;
  radius_auth_port?: number;
  radius_accounting_port?: number;
  radius_nas_id?: string | null;
  radius_auth_method?: "pap" | "chap" | "mschapv2" | "radsec" | string;
  radius_timeout_seconds?: number;
  radius_retries?: number;

  smtp_enabled?: boolean;
  smtp_host?: string | null;
  smtp_port?: number;
  smtp_security?: string | null;
  smtp_auth_enabled?: boolean;
  smtp_user?: string | null;
  smtp_user_configured?: boolean;
  smtp_password_configured?: boolean;
  smtp_from_email?: string | null;
  smtp_from_name?: string | null;
  smtp_timeout_seconds?: number;

  smtp_last_test_at?: string | null;
  smtp_last_test_status?: string | null;
  smtp_last_error?: string | null;
}

export interface SettingsIntegrationsPayload {
  ad_enabled?: boolean;
  ad_host?: string;
  ad_port?: number;
  ad_base_dn?: string;
  ad_bind_dn?: string;
  ad_bind_password?: string;
  ad_use_ssl?: boolean;
  ad_verify_cert?: boolean;
  ad_ca_cert?: string;

  ad_user_search_base?: string;
  ad_group_search_base?: string;
  ad_default_role?: string;
  ad_jit_enabled?: boolean;
  ad_require_mapped_role?: boolean;

  siem_webhook_url?: string;
  siem_transport?: string;
  siem_syslog_host?: string | null;
  siem_syslog_port?: number;
  siem_syslog_protocol?: string;
  siem_syslog_format?: string;
  siem_syslog_facility?: string | null;

  siem_auth_type?: string | null;
  siem_auth_token?: string;
  siem_headers_json?: string | null;

  radius_enabled?: boolean;
  radius_secret?: string;
  radius_host?: string | null;
  radius_auth_port?: number;
  radius_accounting_port?: number;
  radius_nas_id?: string | null;
  radius_auth_method?: string;
  radius_timeout_seconds?: number;
  radius_retries?: number;

  smtp_enabled?: boolean;
  smtp_host?: string | null;
  smtp_port?: number;
  smtp_security?: string | null;
  smtp_auth_enabled?: boolean;
  smtp_user?: string | null;
  smtp_password?: string;
  smtp_from_email?: string | null;
  smtp_from_name?: string | null;
  smtp_timeout_seconds?: number;
}

export interface SIEMTestResponse {
  status: "success" | "failed" | string;
  transport?: string;
  http_status?: number;
  message?: string;
  last_test_at?: string | null;
  last_success_at?: string | null;
  last_delivery_status?: string | null;
  last_error?: string | null;
  last_delivery_operation?: string | null;
  last_exported_events?: number | null;
}

export interface SIEMExportResponse {
  status: "success" | "failed" | string;
  transport?: string;
  http_status?: number;
  exported_events?: number;
  message?: string;
  last_success_at?: string | null;
  last_delivery_status?: string | null;
  last_error?: string | null;
  last_delivery_operation?: string | null;
  last_exported_events?: number | null;
}

export interface SMTPTestResponse {
  status: "success" | "failed" | string;
  message?: string;
  smtp_last_test_at?: string | null;
  smtp_last_test_status?: string | null;
  smtp_last_error?: string | null;
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

  testAd: async () => {
    const res = await fetch(`${API_URL}/settings/integrations/ad/test`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Ошибка соединения с AD");
    return json;
  },

  testSiem: async (): Promise<SIEMTestResponse> => {
    const res = await fetch(`${API_URL}/settings/integrations/siem/test`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Ошибка теста SIEM");
    return json;
  },

  exportSiemNow: async (): Promise<SIEMExportResponse> => {
    const res = await fetch(`${API_URL}/settings/integrations/siem/export-now`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Ошибка ручного экспорта SIEM");
    return json;
  },
};