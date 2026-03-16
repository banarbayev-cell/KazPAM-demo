import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Shield,
  Globe,
  Network,
  Save,
  Server,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

import { settingsApi, Settings, SettingsIntegrationsPayload, ADTestPayload } from "../api/settings";
import LdapRoleMappingsCard from "@/components/settings/LdapRoleMappingsCard";
import LdapSyncCard from "@/components/settings/LdapSyncCard";

type SettingsFormData = Settings & {
  ad_bind_password?: string;
  radius_secret?: string;
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testingAd, setTestingAd] = useState(false);
  const [adTestResult, setAdTestResult] = useState<any | null>(null);
  const [adTestError, setAdTestError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsApi.get();
      setData({
        ...res,
        ad_bind_password: "",
        radius_secret: "",
      });
    } catch {
      toast.error("Ошибка загрузки настроек");
    } finally {
      setLoading(false);
    }
  };

  const save = async (section: "general" | "security" | "integrations", payload: any) => {
    setSaving(section);
    try {
      if (section === "general") await settingsApi.updateGeneral(payload);
      if (section === "security") await settingsApi.updateSecurity(payload);
      if (section === "integrations") await settingsApi.updateIntegrations(payload);

      toast.success("Настройки успешно сохранены");
      await loadSettings();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка сохранения");
    } finally {
      setSaving(null);
    }
  };

  const handleTestAd = async () => {
    if (!data) return;

    setTestingAd(true);
    setAdTestError(null);
    setAdTestResult(null);

    try {
      const payload: ADTestPayload = {
        host: data.ad_host,
        port: data.ad_port,
        bind_dn: data.ad_bind_dn,
        base_dn: data.ad_base_dn,
        use_ssl: data.ad_use_ssl,
      };

      if (data.ad_bind_password?.trim()) {
        payload.bind_password = data.ad_bind_password.trim();
      }

      const res = await settingsApi.testAd(payload);
      setAdTestResult(res);
      toast.success(`Соединение с ${data.ad_host || "AD"} успешно проверено`);
    } catch (e: any) {
      setAdTestError(e?.message || "Ошибка подключения к AD");
      toast.error(e?.message || "Ошибка подключения к AD");
    } finally {
      setTestingAd(false);
    }
  };

  const update = (field: keyof SettingsFormData, value: any) => {
    setData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const buildIntegrationsPayload = (): SettingsIntegrationsPayload => {
    if (!data) return {};

    const payload: SettingsIntegrationsPayload = {
      ad_enabled: data.ad_enabled,
      ad_host: data.ad_host,
      ad_port: data.ad_port,
      ad_base_dn: data.ad_base_dn,
      ad_bind_dn: data.ad_bind_dn,
      ad_use_ssl: data.ad_use_ssl,

      ad_user_search_base: data.ad_user_search_base,
      ad_group_search_base: data.ad_group_search_base,
      ad_default_role: data.ad_default_role,
      ad_jit_enabled: data.ad_jit_enabled,
      ad_require_mapped_role: data.ad_require_mapped_role,

      siem_webhook_url: data.siem_webhook_url,

      radius_enabled: data.radius_enabled,
    };

    if (data.ad_bind_password?.trim()) {
      payload.ad_bind_password = data.ad_bind_password.trim();
    }

    if (data.radius_secret?.trim()) {
      payload.radius_secret = data.radius_secret.trim();
    }

    return payload;
  };

  if (loading || !data) {
    return <div className="p-8 text-gray-500">Загрузка конфигурации KazPAM...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-gray-100 text-black p-6 pb-24">
      <div className="flex items-center gap-4 mb-6 border-b border-gray-300 pb-5">
        <div className="p-3 bg-[#0052FF] rounded-xl shadow-lg shadow-blue-500/20">
          <SettingsIcon className="text-white w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Настройки системы</h1>
          <p className="text-gray-500 mt-1">
            Управление параметрами ядра, безопасностью и интеграциями
          </p>
        </div>
      </div>

      <div className="space-y-6 w-full">
        <Section
          title="Общие параметры"
          icon={<Globe className="text-blue-400" />}
          onSave={() =>
            save("general", {
              system_name: data.system_name,
              language: data.language,
              environment: data.environment,
              timezone: data.timezone,
            })
          }
          loading={saving === "general"}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Название инсталляции"
              value={data.system_name}
              onChange={(v: any) => update("system_name", v)}
            />
            <Select
              label="Язык интерфейса"
              value={data.language}
              onChange={(v: any) => update("language", v)}
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="kz">Қазақша</option>
            </Select>
            <Input
              label="Среда (SRE)"
              value={data.environment}
              onChange={(v: any) => update("environment", v)}
              placeholder="prod"
            />
            <Input
              label="Timezone"
              value={data.timezone}
              onChange={(v: any) => update("timezone", v)}
            />
          </div>
        </Section>

        <Section
          title="Политики безопасности"
          icon={<Shield className="text-green-400" />}
          onSave={() =>
            save("security", {
              mfa_required: data.mfa_required,
              password_rotation_days: data.password_rotation_days,
              lockout_attempts: data.lockout_attempts,
              session_limit_default: data.session_limit_default,
            })
          }
          loading={saving === "security"}
        >
          <div className="bg-[#0E1A3A]/50 border border-white/10 p-4 rounded-xl mb-6 flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Принудительная MFA (2FA)</h4>
              <p className="text-sm text-gray-400">
                Требовать второй фактор для всех административных сессий
              </p>
            </div>
            <Toggle checked={data.mfa_required} onChange={(v: any) => update("mfa_required", v)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Ротация паролей (дней)"
              type="number"
              value={data.password_rotation_days}
              onChange={(v: any) => update("password_rotation_days", Number(v))}
            />
            <Input
              label="Блокировка после (попыток)"
              type="number"
              value={data.lockout_attempts}
              onChange={(v: any) => update("lockout_attempts", Number(v))}
            />
            <Input
              label="Лимит сессий на админа"
              type="number"
              value={data.session_limit_default}
              onChange={(v: any) => update("session_limit_default", Number(v))}
            />
          </div>
        </Section>

        <Section
          title="Интеграции (Enterprise)"
          icon={<Network className="text-purple-400" />}
          onSave={() => save("integrations", buildIntegrationsPayload())}
          loading={saving === "integrations"}
        >
          <div className="border-b border-white/10 pb-8 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-gray-300" />
                <h3 className="text-lg font-semibold text-white">Active Directory / LDAP</h3>
              </div>
              <Toggle checked={data.ad_enabled} onChange={(v: any) => update("ad_enabled", v)} />
            </div>

            {data.ad_enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2">
                  <Input
                    label="Domain Controller Host"
                    value={data.ad_host}
                    onChange={(v: any) => update("ad_host", v)}
                    placeholder="dc01.corp.local"
                  />

                  <Input
                    label="Port"
                    type="number"
                    value={data.ad_port}
                    onChange={(v: any) => update("ad_port", Number(v))}
                  />

                  <Input
                    label="Base DN"
                    value={data.ad_base_dn}
                    onChange={(v: any) => update("ad_base_dn", v)}
                    placeholder="DC=company,DC=local"
                  />

                  <Input
                    label="Bind DN (Service Account)"
                    value={data.ad_bind_dn}
                    onChange={(v: any) => update("ad_bind_dn", v)}
                    placeholder="CN=svc_kazpam,OU=Service Accounts,DC=company,DC=local"
                  />

                  <div className="md:col-span-2">
                    <Input
                      label="Bind Password"
                      type="password"
                      value={data.ad_bind_password}
                      onChange={(v: any) => update("ad_bind_password", v)}
                      placeholder="Введите новый пароль только если нужно обновить"
                    />
                  
                  </div>

                  <Input
                    label="База поиска пользователей"
                    value={data.ad_user_search_base}
                    onChange={(v: any) => update("ad_user_search_base", v)}
                    placeholder="OU=Users,DC=company,DC=local"
                  />

                  <Input
                    label="База поиска групп"
                    value={data.ad_group_search_base}
                    onChange={(v: any) => update("ad_group_search_base", v)}
                    placeholder="OU=Groups,DC=company,DC=local"
                  />

                  <Input
                    label="Роль по умолчанию"
                    value={data.ad_default_role}
                    onChange={(v: any) => update("ad_default_role", v)}
                    placeholder="User"
                  />

                  <div className="md:col-span-2 flex flex-wrap items-center gap-6 mt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.ad_use_ssl}
                        onChange={(e) => update("ad_use_ssl", e.target.checked)}
                        className="accent-blue-500 w-4 h-4"
                      />
                      Использовать SSL (LDAPS)
                    </label>

                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!data.ad_jit_enabled}
                        onChange={(e) => update("ad_jit_enabled", e.target.checked)}
                        className="accent-blue-500 w-4 h-4"
                      />
                      JIT - Автоматически создавать пользователя при первом входе
                    </label>

                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!data.ad_require_mapped_role}
                        onChange={(e) => update("ad_require_mapped_role", e.target.checked)}
                        className="accent-blue-500 w-4 h-4"
                      />
                      Разрешать вход только при наличии LDAP-mapping роли
                    </label>

                    <button
                      onClick={handleTestAd}
                      disabled={testingAd}
                      className="text-xs px-3 py-1.5 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 rounded border border-blue-500/30 transition"
                    >
                      {testingAd ? "Проверка..." : "Проверка доступности контроллера домена и корректность параметров подключения"}
                    </button>
                  </div>
                </div>

                {(adTestResult || adTestError) && (
                  <div className="mt-5 bg-[#121A33] border border-white/10 rounded-xl p-4">
                    <div className="text-white font-medium mb-2">Результат теста AD</div>

                    {adTestError ? (
                      <div className="text-red-300 text-sm">{adTestError}</div>
                    ) : (
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                        {JSON.stringify(adTestResult, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <LdapRoleMappingsCard />
                  <LdapSyncCard />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={18} className="text-gray-300" />
                <h3 className="font-semibold text-white">SIEM Log Forwarding</h3>
              </div>
              <Input
                label="Адрес приёма событий SIEM (Splunk/QRadar)"
                value={data.siem_webhook_url}
                onChange={(v: any) => update("siem_webhook_url", v)}
                placeholder="https://siem-collector..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Аутентификация RADIUS</h3>
                <Toggle checked={data.radius_enabled} onChange={(v: any) => update("radius_enabled", v)} />
              </div>

              {data.radius_enabled && (
                <>
                  <Input
                    label="Shared Secret"
                    type="password"
                    value={data.radius_secret}
                    onChange={(v: any) => update("radius_secret", v)}
                    placeholder="Введите новый secret только если нужно обновить"
                  />
                </>
              )}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

const Section = ({ title, icon, children, onSave, loading }: any) => (
  <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-6 shadow-md overflow-hidden relative w-full">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
    </div>
    <div className="relative z-10">{children}</div>
    <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
      <button
        onClick={onSave}
        disabled={loading}
        className="bg-[#0052FF] hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-900/40"
      >
        {loading ? "Сохранение..." : <><Save size={18} /> Сохранить изменения</>}
      </button>
    </div>
  </div>
);

const Input = ({ label, value, onChange, type = "text", placeholder }: any) => (
  <div className="w-full">
    <label className="block text-sm text-gray-400 mb-1.5 font-medium">{label}</label>
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0E1A3A] border border-[#2A3B55] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-[#0052FF] focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
    />
  </div>
);

const Select = ({ label, value, onChange, children }: any) => (
  <div className="w-full">
    <label className="block text-sm text-gray-400 mb-1.5 font-medium">{label}</label>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0E1A3A] border border-[#2A3B55] rounded-lg px-4 py-3 text-white focus:border-[#0052FF] focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none transition-all"
    >
      {children}
    </select>
  </div>
);

const Toggle = ({ checked, onChange }: any) => (
  <div
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ${
      checked ? "bg-[#0052FF]" : "bg-gray-700"
    }`}
  >
    <div
      className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
        checked ? "translate-x-6" : "translate-x-0"
      }`}
    />
  </div>
);