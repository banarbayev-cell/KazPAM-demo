// src/api/settings.ts
import { API_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

async function handleResponse(res: Response) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      data?.detail ||
      data?.message ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

// =========================
// Types
// =========================

export interface Settings {
  general: {
    system_name: string;
    environment: string;
    timezone: string;
  };

  security: {
    mfa_required: boolean;
    session_limit_default: number;
  };

  integrations: {
    ad_enabled: boolean;
    ad_host: string;
    ad_port: number;
    ad_base_dn: string;
    ad_bind_dn: string;
    ad_use_ssl: boolean;
  };
}

// =========================
// API
// =========================

export async function getSettings(): Promise<Settings> {
  const res = await fetch(`${API_URL}/settings`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function updateGeneralSettings(payload: Settings["general"]) {
  const res = await fetch(`${API_URL}/settings/general`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateSecuritySettings(payload: Settings["security"]) {
  const res = await fetch(`${API_URL}/settings/security`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateIntegrationsSettings(
  payload: Settings["integrations"]
) {
  const res = await fetch(`${API_URL}/settings/integrations`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function testAdConnection() {
  const res = await fetch(`${API_URL}/settings/integrations/ad/test`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}
