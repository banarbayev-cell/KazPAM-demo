import { NavLink } from "react-router-dom";
import Access from "../Access";

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-[#0A0F24] text-white flex flex-col p-6 border-r border-white/10">
      <h1 className="text-3xl font-bold mb-8 select-none">
        Kaz<span className="text-[#0052FF]">PAM</span>
      </h1>

      <nav className="flex-1 flex flex-col space-y-1">
        <Access permission="view_dashboard" hide>
          <NavLink to="/dashboard" className={navClass}>
            Главная
          </NavLink>
        </Access>

        <Access permission="view_soc" hide>
          <NavLink to="/soc" className={navClass}>
            SOC
          </NavLink>
        </Access>

        <Access permission="view_incidents" hide>
          <NavLink to="/soc/incidents" className={navClass}>
            Инциденты
          </NavLink>
        </Access>

        <Access permission="view_soc" hide>
          <NavLink to="/soc/commands" className={navClass}>
            Команды сессий
          </NavLink>
        </Access>

        <div className="my-3 border-t border-white/10" />

        <Access permission="manage_users" hide>
          <NavLink to="/users" className={navClass}>
            Пользователи
          </NavLink>
        </Access>

        <Access permission="manage_roles" hide>
          <NavLink to="/roles" className={navClass}>
            Роли
          </NavLink>
        </Access>

        {/*
          Раздел "Управление доступом" скрыт из меню.
          Заказчик не понял назначение раздела, а управление правами остаётся внутри ролей.
          Backend permissions не удаляем.
        */}

        <div className="my-3 border-t border-white/10" />

        <Access permission="view_sessions" hide>
          <NavLink to="/sessions" className={navClass}>
            Сессии
          </NavLink>
        </Access>

        <Access permission="view_soc" hide>
          <NavLink to="/recordings" className={navClass}>
            Записи сессий
          </NavLink>
        </Access>

        <Access permission="manage_discovery" hide>
          <NavLink to="/discovery" className={navClass}>
            Обнаружение
          </NavLink>
        </Access>

        <Access permission="manage_settings" hide>
          <NavLink to="/targets" className={navClass}>
            Целевые системы
          </NavLink>
        </Access>

        <Access permission="view_vault" hide>
          <NavLink to="/vault" className={navClass}>
            Хранилище
          </NavLink>
        </Access>

        <Access permission="view_vault_requests" hide>
          <NavLink to="/vault/requests" className={navClass}>
            Запросы доступа
          </NavLink>
        </Access>

        <Access permission="manage_policies" hide>
          <NavLink to="/policies" className={navClass}>
            Политики безопасности
          </NavLink>
        </Access>

        <Access permission="view_audit" hide>
          <NavLink to="/audit" className={navClass}>
            Аудит
          </NavLink>
        </Access>

        <div className="my-3 border-t border-white/10" />

        <Access permission="view_settings" hide>
          <NavLink to="/settings" className={navClass}>
            Настройки
          </NavLink>
        </Access>

        <Access permission="view_settings" hide>
          <NavLink to="/license" className={navClass}>
            Лицензия
          </NavLink>
        </Access>
      </nav>

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