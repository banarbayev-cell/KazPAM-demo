import { NavLink } from "react-router-dom";
import Access from "../Access";

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-[#0A0F24] text-white flex flex-col p-6 border-r border-white/10">
      {/* LOGO */}
      <h1 className="text-3xl font-bold mb-8 select-none">
        Kaz<span className="text-[#0052FF]">PAM</span>
      </h1>

      {/* NAV */}
      <nav className="flex-1 flex flex-col space-y-1">
        {/* Основное */}
        <NavLink to="/dashboard" className={navClass}>
          Главная
        </NavLink>

        <Access permission="view_soc">
          <NavLink to="/soc" className={navClass}>
            SOC
          </NavLink>
        </Access>

        <div className="my-3 border-t border-white/10" />

        {/* Управление */}
        <NavLink to="/users" className={navClass}>
          Пользователи
        </NavLink>

        <Access permission="manage_roles">
          <NavLink to="/roles" className={navClass}>
            Роли
          </NavLink>
        </Access>

        <Access permission="manage_permissions">
          <NavLink to="/permissions" className={navClass}>
            Управление доступом
          </NavLink>
        </Access>

        <div className="my-3 border-t border-white/10" />

        {/* Безопасность */}
        <NavLink to="/sessions" className={navClass}>
          Сессии
        </NavLink>

        <Access permission="view_vault">
          <NavLink to="/vault" className={navClass}>
            Хранилище
          </NavLink>
        </Access>

        <Access permission="manage_policies">
          <NavLink to="/policies" className={navClass}>
            Политики безопасности
          </NavLink>
        </Access>

        <Access permission="view_audit">
          <NavLink to="/audit" className={navClass}>
            Аудит
          </NavLink>
        </Access>

        <div className="my-3 border-t border-white/10" />

        {/* Системное */}
        <NavLink to="/settings" className={navClass}>
          Настройки
        </NavLink>
      </nav>

      {/* FOOTER */}
      <div className="text-xs text-gray-400 pt-4 border-t border-white/10">
        KazPAM · v1.0.0 MVP
      </div>
    </aside>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-md transition cursor-pointer select-none ${
    isActive
      ? "bg-[#0052FF] text-white font-semibold"
      : "text-gray-300 hover:bg-[#1A2141] hover:text-[#3BE3FD]"
  }`;
