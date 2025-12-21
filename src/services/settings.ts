// src/services/settings.ts
import { api } from "./api";

/* =======================
   TYPES
======================= */

export interface GeneralSettings {
  system_name: string;
  language: "ru" | "en" | "kz";
}

export interface SecuritySettings {
  mfa_enabled: boolean;
  password_rotation_days: number;
  lockout_attempts: number;
}

export interface IntegrationSettings {
  ldap_url?: string;
  siem_webhook_url?: string;

  // Cisco / RADIUS / ISE
  cisco_ise_host?: string;
  radius_secret?: string;
}

export interface SystemSettings {
  general: GeneralSettings;
  security: SecuritySettings;
  integrations: IntegrationSettings;
}

/* =======================
   API
======================= */

export const settingsApi = {
  /** Получить все настройки */
  get(): Promise<SystemSettings> {
    return api.get<SystemSettings>("/settings");
  },

  /** Общие */
  updateGeneral(data: Partial<GeneralSettings>) {
    return api.patch("/settings/general", data);
  },

  /** Безопасность */
  updateSecurity(data: Partial<SecuritySettings>) {
    return api.patch("/settings/security", data);
  },

  /** Интеграции */
  updateIntegrations(data: Partial<IntegrationSettings>) {
    return api.patch("/settings/integrations", data);
  },
};
