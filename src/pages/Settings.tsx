import { useEffect, useMemo, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

// Production API (у тебя уже правильный)
import {
  getSettings,
  updateGeneralSettings,
  updateSecuritySettings,
  updateIntegrationsSettings,
  testAdConnection,
  Settings as BackendSettings,
} from "../api/settings";

/**
 * ВАЖНО:
 * - Backend контракт зафиксирован и production: general/environment/timezone, security/mfa_required/session_limit_default,
 *   integrations/ad_*.
 * - Текущий UI содержит дополнительные поля (language, password_rotation_days, lockout_attempts, ldap_url, siem_webhook_url).
 *   Чтобы НЕ ломать UI и не слать невалидные поля в backend — храним эти "UI-only" настройки в localStorage.
 */

/* =======================
   UI-only settings types
======================= */
type UiGeneral = {
  language: "ru" | "en" | "kz";
};

type UiSecurity = {
  password_rotation_days: number;
  lockout_attempts: number;
};

type UiIntegrations = {
  ldap_url?: string;
  siem_webhook_url?: string;
};

type UiOnlySettings = {
  general: UiGeneral;
  security: UiSecurity;
  integrations: UiIntegrations;
};

/* =======================
   Combined settings for UI
   (backend + ui-only)
======================= */
type SettingsState = {
  general: BackendSettings["general"] & UiGeneral;
  security: BackendSettings["security"] & UiSecurity;
  integrations: BackendSettings["integrations"] & UiIntegrations;
};

/* =======================
   localStorage helpers
======================= */
const UI_SETTINGS_STORAGE_KEY = "kazpam_ui_settings_v1";

function loadUiOnlySettings(): UiOnlySettings {
  try {
    const raw = localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        general: { language: "ru" },
        security: { password_rotation_days: 0, lockout_attempts: 0 },
        integrations: { ldap_url: "", siem_webhook_url: "" },
      };
    }
    const parsed = JSON.parse(raw);

    return {
      general: {
        language: parsed?.general?.language ?? "ru",
      },
      security: {
        password_rotation_days: Number(parsed?.security?.password_rotation_days ?? 0),
        lockout_attempts: Number(parsed?.security?.lockout_attempts ?? 0),
      },
      integrations: {
        ldap_url: parsed?.integrations?.ldap_url ?? "",
        siem_webhook_url: parsed?.integrations?.siem_webhook_url ?? "",
      },
    };
  } catch {
    return {
      general: { language: "ru" },
      security: { password_rotation_days: 0, lockout_attempts: 0 },
      integrations: { ldap_url: "", siem_webhook_url: "" },
    };
  }
}

function saveUiOnlySettings(ui: UiOnlySettings) {
  try {
    localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(ui));
  } catch {
    // best-effort, не ломаем поток
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<null | "general" | "security" | "integrations">(null);
  const [testingAd, setTestingAd] = useState(false);

  const uiOnlyDefaults = useMemo(() => loadUiOnlySettings(), []);

  /* =======================
     LOAD SETTINGS (backend + ui-only)
  ======================= */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const backend = await getSettings(); // production backend settings
        const uiOnly = loadUiOnlySettings(); // актуальные ui-only (на случай если менялись в другом месте)

        const combined: SettingsState = {
          general: {
            ...backend.general,
            language: uiOnly.general.language,
          },
          security: {
            ...backend.security,
            // маппинг: старый UI чекбокс "mfa_enabled" -> production "mfa_required"
            // здесь мы просто держим UI с правильным полем mfa_required и отображаем его в чекбоксе ниже
            password_rotation_days: uiOnly.security.password_rotation_days,
            lockout_attempts: uiOnly.security.lockout_attempts,
          },
          integrations: {
            ...backend.integrations,
            ldap_url: uiOnly.integrations.ldap_url,
            siem_webhook_url: uiOnly.integrations.siem_webhook_url,
          },
        };

        if (!cancelled) {
          setSettings(combined);
        }
      } catch (e: any) {
        toast.error(e?.message || "Не удалось загрузить настройки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [uiOnlyDefaults]);

  /* =======================
     UI-only persist on changes (best effort)
     Не мешаем сохранению в backend
  ======================= */
  useEffect(() => {
    if (!settings) return;

    const uiOnly: UiOnlySettings = {
      general: { language: settings.general.language },
      security: {
        password_rotation_days: settings.security.password_rotation_days,
        lockout_attempts: settings.security.lockout_attempts,
      },
      integrations: {
        ldap_url: settings.integrations.ldap_url ?? "",
        siem_webhook_url: settings.integrations.siem_webhook_url ?? "",
      },
    };

    saveUiOnlySettings(uiOnly);
  }, [settings]);

  if (loading || !settings) {
    // Не ломаем UX: вместо null даём простой лоадер (можно заменить позже)
    return (
      <div className="min-h-screen bg-white text-black p-8">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon size={32} className="text-[#0052FF]" />
          <h1 className="text-3xl font-bold">Настройки системы</h1>
        </div>
        <div className="text-sm text-gray-600">Загрузка настроек…</div>
      </div>
    );
  }

  /* =======================
     HANDLERS
  ======================= */

  const saveGeneral = async () => {
    try {
      setSaving("general");

      // В backend отправляем ТОЛЬКО production поля
      await updateGeneralSettings({
        system_name: settings.general.system_name,
        environment: settings.general.environment,
        timezone: settings.general.timezone,
      });

      toast.success("Общие настройки сохранены");
    } catch (e: any) {
      toast.error(e?.message || "Ошибка сохранения");
    } finally {
      setSaving(null);
    }
  };

  const saveSecurity = async () => {
    try {
      setSaving("security");

      // В backend отправляем ТОЛЬКО production поля
      await updateSecuritySettings({
        mfa_required: settings.security.mfa_required,
        session_limit_default: settings.security.session_limit_default,
      });

      toast.success("Настройки безопасности сохранены");
    } catch (e: any) {
      toast.error(e?.message || "Ошибка сохранения");
    } finally {
      setSaving(null);
    }
  };

  const saveIntegrations = async () => {
    try {
      setSaving("integrations");

      // В backend отправляем ТОЛЬКО production поля (AD block)
      await updateIntegrationsSettings({
        ad_enabled: settings.integrations.ad_enabled,
        ad_host: settings.integrations.ad_host,
        ad_port: settings.integrations.ad_port,
        ad_base_dn: settings.integrations.ad_base_dn,
        ad_bind_dn: settings.integrations.ad_bind_dn,
        ad_use_ssl: settings.integrations.ad_use_ssl,
      });

      toast.success("Интеграции сохранены");
    } catch (e: any) {
      toast.error(e?.message || "Ошибка сохранения");
    } finally {
      setSaving(null);
    }
  };

  const handleTestAd = async () => {
    try {
      setTestingAd(true);
      const result = await testAdConnection();

      // backend может вернуть { ok: true, ... } или detail/message — мы показываем дружелюбно
      toast.success(
        typeof result === "string"
          ? result
          : result?.message || "AD connection успешна"
      );
    } catch (e: any) {
      // Важно: показываем текст ошибки из backend (400)
      toast.error(e?.message || "Ошибка AD test");
    } finally {
      setTestingAd(false);
    }
  };

  /* =======================
     RENDER
  ======================= */

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon size={32} className="text-[#0052FF]" />
        <h1 className="text-3xl font-bold">Настройки системы</h1>
      </div>

      {/* ---------- Общие настройки --------- */}
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl shadow-xl p-6 mb-8 text-white">
        <h2 className="text-xl font-semibold mb-4 text-[#3BE3FD]">
          Общие параметры
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Название системы
            </label>
            <input
              type="text"
              value={settings.general.system_name}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  general: {
                    ...settings.general,
                    system_name: e.target.value,
                  },
                })
              }
              className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* UI-only поле оставляем (НЕ ломаем), но оно не уходит в backend */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Язык интерфейса
            </label>
            <select
              value={settings.general.language}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  general: {
                    ...settings.general,
                    language: e.target.value as "ru" | "en" | "kz",
                  },
                })
              }
              className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="kz">Қазақша</option>
            </select>
            <div className="mt-1 text-xs text-gray-400">
              Сейчас язык сохраняется локально (UI), backend не меняется.
            </div>
          </div>

          {/* production поля backend: environment */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Environment
            </label>
            <input
              type="text"
              value={settings.general.environment}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  general: { ...settings.general, environment: e.target.value },
                })
              }
              placeholder="prod / pilot / demo"
              className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* production поля backend: timezone */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Timezone
            </label>
            <input
              type="text"
              value={settings.general.timezone}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  general: { ...settings.general, timezone: e.target.value },
                })
              }
              placeholder="Asia/Almaty"
              className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        <button
          onClick={saveGeneral}
          disabled={saving !== null}
          className="mt-6 bg-[#0052FF] hover:bg-[#003ED9] disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition"
        >
          {saving === "general" ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      {/* ---------- Безопасность ---------- */}
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl shadow-xl p-6 mb-8 text-white">
        <h2 className="text-xl font-semibold mb-4 text-[#3BE3FD]">
          Безопасность
        </h2>

        <div className="space-y-4 text-gray-200">
          {/* Маппинг: твой UI "mfa_enabled" -> production backend "mfa_required" */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.security.mfa_required}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    mfa_required: e.target.checked,
                  },
                })
              }
              className="accent-[#0052FF] w-5 h-5"
            />
            <span>Двухфакторная аутентификация (2FA)</span>
          </label>

          {/* UI-only (оставляем), хранится локально */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.security.password_rotation_days === 90}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    password_rotation_days: e.target.checked ? 90 : 0,
                  },
                })
              }
              className="accent-[#0052FF] w-5 h-5"
            />
            <span>Требовать смену пароля каждые 90 дней</span>
          </label>

          {/* UI-only (оставляем), хранится локально */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.security.lockout_attempts === 5}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    lockout_attempts: e.target.checked ? 5 : 0,
                  },
                })
              }
              className="accent-[#0052FF] w-5 h-5"
            />
            <span>Блокировать аккаунт после 5 неверных попыток входа</span>
          </label>

          {/* production поле: session_limit_default */}
          <div className="pt-2">
            <label className="block text-sm text-gray-300 mb-1">
              Лимит активных сессий по умолчанию
            </label>
            <input
              type="number"
              min={0}
              value={settings.security.session_limit_default}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    session_limit_default: Number(e.target.value || 0),
                  },
                })
              }
              className="w-full md:w-[240px] bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="text-xs text-gray-400">
            Политики rotation/lockout сейчас сохраняются локально (UI), backend не меняется.
          </div>
        </div>

        <button
          onClick={saveSecurity}
          disabled={saving !== null}
          className="mt-6 bg-[#0052FF] hover:bg-[#003ED9] disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition"
        >
          {saving === "security" ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      {/* ---------- Интеграция ---------- */}
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl shadow-xl p-6 text-white mb-10">
        <h2 className="text-xl font-semibold mb-4 text-[#3BE3FD]">
          Интеграция
        </h2>

        {/* Production AD fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={settings.integrations.ad_enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  integrations: {
                    ...settings.integrations,
                    ad_enabled: e.target.checked,
                  },
                })
              }
              className="accent-[#0052FF] w-5 h-5"
            />
            <span>Включить Active Directory интеграцию</span>
          </label>

          <div>
            <label className="block text-sm text-gray-300 mb-1">AD Host</label>
            <input
              type="text"
              value={settings.integrations.ad_host}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  integrations: {
                    ...settings.integrations,
                    ad_host: e.target.value,
                  },
                })
              }
              placeholder="dc01.company.local"
              className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">AD Port</label>
            <input
              type="number"
              value={settings.integrations.ad_port}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  integrations: {
                    ...settings.integrations,
                    ad_port: Number(e.target.value || 0),
                  },
                })
              }
              placeholder="389"
              className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Base DN</label>
            <input
              type="text"
              value={settings.integrations.ad_base_dn}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  integrations: {
                    ...settings.integrations,
                    ad_base_dn: e.target.value,
                  },
                })
              }
              placeholder="DC=company,DC=local"
              className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Bind DN</label>
            <input
              type="text"
              value={settings.integrations.ad_bind_dn}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  integrations: {
                    ...settings.integrations,
                    ad_bind_dn: e.target.value,
                  },
                })
              }
              placeholder="CN=svc_kazpam,OU=Service Accounts,DC=company,DC=local"
              className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={settings.integrations.ad_use_ssl}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  integrations: {
                    ...settings.integrations,
                    ad_use_ssl: e.target.checked,
                  },
                })
              }
              className="accent-[#0052FF] w-5 h-5"
            />
            <span>Use SSL (LDAPS)</span>
          </label>
        </div>

        {/* UI-only legacy fields (не ломаем), храним локально */}
        <div className="mt-8 border-t border-[#1E2A45] pt-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">
            Дополнительно (UI, локально)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                LDAP / Active Directory (legacy URL)
              </label>
              <input
                type="text"
                value={settings.integrations.ldap_url || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      ldap_url: e.target.value,
                    },
                  })
                }
                placeholder="ldap://domain.local"
                className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">
                SIEM Webhook URL (UI-only)
              </label>
              <input
                type="text"
                value={settings.integrations.siem_webhook_url || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      siem_webhook_url: e.target.value,
                    },
                  })
                }
                placeholder="https://siem.company.kz/hook"
                className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-400">
            Эти поля пока не поддерживаются backend Settings API и сохраняются локально, чтобы не ломать текущий UI.
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-6">
          <button
            onClick={saveIntegrations}
            disabled={saving !== null}
            className="bg-[#0052FF] hover:bg-[#003ED9] disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition"
          >
            {saving === "integrations" ? "Сохранение…" : "Сохранить"}
          </button>

          <button
            onClick={handleTestAd}
            disabled={testingAd || saving !== null}
            className="bg-[#0E1A3A] hover:bg-[#0B1530] disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition border border-[#1E2A45]"
          >
            {testingAd ? "Тестирование AD…" : "Test AD connection"}
          </button>
        </div>
      </div>
    </div>
  );
}
