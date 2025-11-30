import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon size={32} className="text-[#0052FF]" />
        <h1 className="text-3xl font-bold">Настройки системы</h1>
      </div>

      {/* ---------- Общие настройки --------- */}
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl shadow-xl p-6 mb-8 text-white">
        <h2 className="text-xl font-semibold mb-4 text-[#3BE3FD]">Общие параметры</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Название системы</label>
            <input
              type="text"
              defaultValue="KazPAM"
              className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Язык интерфейса</label>
            <select className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white">
              <option>Русский</option>
              <option>English</option>
              <option>Қазақша</option>
            </select>
          </div>
        </div>

        <button className="mt-6 bg-[#0052FF] hover:bg-[#003ED9] text-white font-semibold px-6 py-2 rounded-lg transition">
          Сохранить
        </button>
      </div>

      {/* ---------- Безопасность ---------- */}
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl shadow-xl p-6 mb-8 text-white">
        <h2 className="text-xl font-semibold mb-4 text-[#3BE3FD]">Безопасность</h2>

        <div className="space-y-4 text-gray-200">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="accent-[#0052FF] w-5 h-5" />
            <span>Двухфакторная аутентификация (2FA)</span>
          </label>

          <label className="flex items-center gap-3">
            <input type="checkbox" className="accent-[#0052FF] w-5 h-5" />
            <span>Требовать смену пароля каждые 90 дней</span>
          </label>

          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="accent-[#0052FF] w-5 h-5" />
            <span>Блокировать аккаунт после 5 неверных попыток входа</span>
          </label>
        </div>

        <button className="mt-6 bg-[#0052FF] hover:bg-[#003ED9] text-white font-semibold px-6 py-2 rounded-lg transition">
          Сохранить
        </button>
      </div>

      {/* ---------- Интеграция ---------- */}
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl shadow-xl p-6 text-white mb-10">
        <h2 className="text-xl font-semibold mb-4 text-[#3BE3FD]">Интеграция</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-300 mb-1">LDAP / Active Directory</label>
            <input
              type="text"
              placeholder="ldap://domain.local"
              className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">SIEM Webhook URL</label>
            <input
              type="text"
              placeholder="https://siem.company.kz/hook"
              className="w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        <button className="mt-6 bg-[#0052FF] hover:bg-[#003ED9] text-white font-semibold px-6 py-2 rounded-lg transition">
          Сохранить
        </button>
      </div>
    </div>
  );
}
