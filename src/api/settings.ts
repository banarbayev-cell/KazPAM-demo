// src/api/settings.ts
import { API_URL } from "./config";

/* =======================
   TYPES
======================= */

export interface Settings {
  system_name: string;
  language: string;
  environment: string;
  timezone: string;

  mfa_required: boolean;
  password_rotation_days: number;
  lockout_attempts: number;
  session_limit_default: number;

  ad_enabled: boolean;
  ad_host: string;
  ad_port: number;
  ad_base_dn: string;
  ad_bind_dn: string;
  ad_use_ssl: boolean;

  siem_webhook_url: string;
  radius_enabled: boolean;
  radius_secret?: string;
}

/* =======================
   API CLIENT
======================= */

// Вспомогательная функция для заголовков (чтобы каждый раз не писать)
const getHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "",
  };
};

export const settingsApi = {
  // Получить все настройки
  get: async (): Promise<Settings> => {
    const res = await fetch(`${API_URL}/settings`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Не удалось загрузить настройки");
    return res.json();
  },

  // Обновить общие настройки
  updateGeneral: async (data: Partial<Settings>) => {
    const res = await fetch(`${API_URL}/settings/general`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Ошибка обновления общих настроек");
    return res.json();
  },

  // Обновить безопасность
  updateSecurity: async (data: Partial<Settings>) => {
    const res = await fetch(`${API_URL}/settings/security`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Ошибка обновления безопасности");
    return res.json();
  },

  // Обновить интеграции
  updateIntegrations: async (data: Partial<Settings>) => {
    const res = await fetch(`${API_URL}/settings/integrations`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Ошибка обновления интеграций");
    return res.json();
  },

  // Тест подключения к AD
  testAd: async (data: any) => {
    const res = await fetch(`${API_URL}/settings/integrations/ad/test`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Ошибка соединения с AD");
    return json;
  },
};