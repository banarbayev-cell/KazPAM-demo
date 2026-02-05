import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Shield, Globe, Network, Save, Server, Activity } from "lucide-react";
import { toast } from "sonner";
import { settingsApi } from "../api/settings"; // Убедитесь, что путь верный
import { API_URL } from "../api/config"; // Используем для проверки, если нужно

// Интерфейс данных
interface SettingsData {
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

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testingAd, setTestingAd] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsApi.get();
      setData(res);
    } catch (e) {
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
      loadSettings(); 
    } catch (e) {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(null);
    }
  };

  const handleTestAd = async () => {
    if (!data) return;
    setTestingAd(true);
    try {
      // Передаем параметры явно для теста
      await settingsApi.testAd({
        host: data.ad_host,
        port: data.ad_port,
        username: data.ad_bind_dn,
        password: "dummy-password", 
        use_ssl: data.ad_use_ssl
      });
      toast.success(`Соединение с ${data.ad_host} успешно установлено`);
    } catch (e: any) {
      toast.error(e.message || "Ошибка подключения к AD");
    } finally {
      setTestingAd(false);
    }
  };

  const update = (field: keyof SettingsData, value: any) => {
    setData(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  if (loading || !data) return <div className="p-8 text-gray-500">Загрузка конфигурации KazPAM...</div>;

  return (
    // ИСПРАВЛЕНИЕ: bg-gray-100 вместо белого, убрали лишние отступы, добавили w-full
    <div className="w-full min-h-screen bg-gray-100 text-black p-6 pb-24">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-300 pb-5">
        <div className="p-3 bg-[#0052FF] rounded-xl shadow-lg shadow-blue-500/20">
          <SettingsIcon className="text-white w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Настройки системы</h1>
          <p className="text-gray-500 mt-1">Управление параметрами ядра, безопасностью и интеграциями</p>
        </div>
      </div>

      {/* ИСПРАВЛЕНИЕ: Убрали max-w-6xl, теперь блоки тянутся на всю ширину */}
      <div className="space-y-6 w-full">
        
        {/* 1. GENERAL */}
        <Section title="Общие параметры" icon={<Globe className="text-blue-400" />} 
                 onSave={() => save("general", { 
                   system_name: data.system_name, language: data.language, 
                   environment: data.environment, timezone: data.timezone 
                 })} loading={saving === "general"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Название инсталляции" value={data.system_name} onChange={(v: any) => update("system_name", v)} />
            <Select label="Язык интерфейса" value={data.language} onChange={(v: any) => update("language", v)}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="kz">Қазақша</option>
            </Select>
            <Input label="Environment (SRE)" value={data.environment} onChange={(v: any) => update("environment", v)} placeholder="production" />
            <Input label="Timezone" value={data.timezone} onChange={(v: any) => update("timezone", v)} />
          </div>
        </Section>

        {/* 2. SECURITY */}
        <Section title="Политики безопасности" icon={<Shield className="text-green-400" />} 
                 onSave={() => save("security", {
                   mfa_required: data.mfa_required, password_rotation_days: data.password_rotation_days,
                   lockout_attempts: data.lockout_attempts, session_limit_default: data.session_limit_default
                 })} loading={saving === "security"}>
           
           <div className="bg-[#0E1A3A]/50 border border-white/10 p-4 rounded-xl mb-6 flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Принудительная MFA (2FA)</h4>
                <p className="text-sm text-gray-400">Требовать второй фактор для всех административных сессий</p>
              </div>
              <Toggle checked={data.mfa_required} onChange={(v: any) => update("mfa_required", v)} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="Ротация паролей (дней)" type="number" value={data.password_rotation_days} onChange={(v: any) => update("password_rotation_days", Number(v))} />
              <Input label="Блокировка после (попыток)" type="number" value={data.lockout_attempts} onChange={(v: any) => update("lockout_attempts", Number(v))} />
              <Input label="Лимит сессий на админа" type="number" value={data.session_limit_default} onChange={(v: any) => update("session_limit_default", Number(v))} />
           </div>
        </Section>

        {/* 3. INTEGRATIONS */}
        <Section title="Интеграции (Enterprise)" icon={<Network className="text-purple-400" />} 
                 onSave={() => save("integrations", {
                    ad_enabled: data.ad_enabled, ad_host: data.ad_host, ad_port: data.ad_port,
                    ad_base_dn: data.ad_base_dn, ad_bind_dn: data.ad_bind_dn, ad_use_ssl: data.ad_use_ssl,
                    siem_webhook_url: data.siem_webhook_url, radius_enabled: data.radius_enabled, radius_secret: data.radius_secret
                 })} loading={saving === "integrations"}>
            
            {/* Active Directory */}
            <div className="border-b border-white/10 pb-8 mb-8">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                     <Server size={18} className="text-gray-300" />
                     <h3 className="text-lg font-semibold text-white">Active Directory / LDAP</h3>
                  </div>
                  <Toggle checked={data.ad_enabled} onChange={(v: any) => update("ad_enabled", v)} />
               </div>

               {data.ad_enabled && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2">
                    <Input label="Domain Controller Host" value={data.ad_host} onChange={(v: any) => update("ad_host", v)} placeholder="dc01.corp.local" />
                    <Input label="Port" type="number" value={data.ad_port} onChange={(v: any) => update("ad_port", Number(v))} />
                    <Input label="Base DN" value={data.ad_base_dn} onChange={(v: any) => update("ad_base_dn", v)} placeholder="DC=company,DC=local" />
                    <Input label="Bind DN (Service Account)" value={data.ad_bind_dn} onChange={(v: any) => update("ad_bind_dn", v)} placeholder="CN=svc_kazpam..." />
                    
                    <div className="md:col-span-2 flex items-center gap-4 mt-2">
                       <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input type="checkbox" checked={data.ad_use_ssl} onChange={(e) => update("ad_use_ssl", e.target.checked)} className="accent-blue-500 w-4 h-4" />
                          Использовать SSL (LDAPS)
                       </label>
                       <button onClick={handleTestAd} disabled={testingAd} className="text-xs px-3 py-1.5 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 rounded border border-blue-500/30 transition">
                          {testingAd ? "Проверка..." : "Тест подключения"}
                       </button>
                    </div>
                 </div>
               )}
            </div>

            {/* SIEM & RADIUS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div>
                  <div className="flex items-center gap-2 mb-3">
                     <Activity size={18} className="text-gray-300" />
                     <h3 className="font-semibold text-white">SIEM Log Forwarding</h3>
                  </div>
                  <Input label="Webhook URL (Splunk/QRadar)" value={data.siem_webhook_url} onChange={(v: any) => update("siem_webhook_url", v)} placeholder="https://siem-collector..." />
               </div>
               
               <div>
                  <div className="flex items-center justify-between mb-3">
                     <h3 className="font-semibold text-white">RADIUS Auth</h3>
                     <Toggle checked={data.radius_enabled} onChange={(v: any) => update("radius_enabled", v)} />
                  </div>
                  {data.radius_enabled && (
                     <Input label="Shared Secret" type="password" value={data.radius_secret} onChange={(v: any) => update("radius_secret", v)} placeholder="••••••••" />
                  )}
               </div>
            </div>
        </Section>
      </div>
    </div>
  );
}

// --- UI Components (ИСПРАВЛЕНЫ СТИЛИ) ---
const Section = ({ title, icon, children, onSave, loading }: any) => (
  // ИСПРАВЛЕНИЕ: shadow-md вместо shadow-xl, чтобы не было "тяжело", w-full
  <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-6 shadow-md overflow-hidden relative w-full">
     <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
           <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
     </div>
     <div className="relative z-10">{children}</div>
     <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
        <button onClick={onSave} disabled={loading} className="bg-[#0052FF] hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-900/40">
           {loading ? "Сохранение..." : <><Save size={18} /> Сохранить изменения</>}
        </button>
     </div>
  </div>
);

const Input = ({ label, value, onChange, type = "text", placeholder }: any) => (
  <div className="w-full">
    <label className="block text-sm text-gray-400 mb-1.5 font-medium">{label}</label>
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-[#0E1A3A] border border-[#2A3B55] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-[#0052FF] focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all" />
  </div>
);

const Select = ({ label, value, onChange, children }: any) => (
  <div className="w-full">
    <label className="block text-sm text-gray-400 mb-1.5 font-medium">{label}</label>
    <select value={value || ""} onChange={e => onChange(e.target.value)}
      className="w-full bg-[#0E1A3A] border border-[#2A3B55] rounded-lg px-4 py-3 text-white focus:border-[#0052FF] focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none transition-all">
      {children}
    </select>
  </div>
);

const Toggle = ({ checked, onChange }: any) => (
  <div onClick={() => onChange(!checked)} className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ${checked ? "bg-[#0052FF]" : "bg-gray-700"}`}>
    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-0"}`} />
  </div>
);