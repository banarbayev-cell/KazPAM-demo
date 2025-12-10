import { NavLink } from "react-router-dom";
import Access from "../Access"; // проверь путь — обычно "../components/Access"

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-[#0A0F24] text-white flex flex-col p-6 border-r border-white/10">
      <h1 className="text-3xl font-bold mb-10">
        Kaz<span className="text-[#0052FF]">PAM</span>
      </h1>

      <nav className="space-y-2">

        {/* Главная */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md transition text-gray-300 ${
              isActive
                ? "bg-[#0052FF] text-white font-semibold"
                : "hover:bg-[#1A2141] hover:text-[#3BE3FD]"
            }`
          }
        >
          Главная
        </NavLink>

        {/* Пользователи */}
        <NavLink
          to="/users"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md transition text-gray-300 ${
              isActive
                ? "bg-[#0052FF] text-white font-semibold"
                : "hover:bg-[#1A2141] hover:text-[#3BE3FD]"
            }`
          }
        >
          Пользователи
        </NavLink>

        {/* Роли — доступ только при permission manage_roles */}
        <Access permission="manage_roles">
          <NavLink
            to="/roles"
            className={({ isActive }) =>
              `block px-4 py-2 rounded-md transition text-gray-300 ${
                isActive
                  ? "bg-[#0052FF] text-white font-semibold"
                  : "hover:bg-[#1A2141] hover:text-[#3BE3FD]"
              }`
            }
          >
            Роли
          </NavLink>
        </Access>

        {/* Сессии */}
        <NavLink
          to="/sessions"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md transition text-gray-300 ${
              isActive
                ? "bg-[#0052FF] text-white font-semibold"
                : "hover:bg-[#1A2141] hover:text-[#3BE3FD]"
            }`
          }
        >
          Сессии
        </NavLink>

        {/* Хранилище */}
        <NavLink
          to="/vault"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md transition text-gray-300 ${
              isActive
                ? "bg-[#0052FF] text-white font-semibold"
                : "hover:bg-[#1A2141] hover:text-[#3BE3FD]"
            }`
          }
        >
          Хранилище
        </NavLink>

        {/* Политики */}
        <NavLink
          to="/policies"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md transition text-gray-300 ${
              isActive
                ? "bg-[#0052FF] text-white font-semibold"
                : "hover:bg-[#1A2141] hover:text-[#3BE3FD]"
            }`
          }
        >
          Политики безопасности
        </NavLink>

        {/* Аудит */}
        <NavLink
          to="/audit"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md transition text-gray-300 ${
              isActive
                ? "bg-[#0052FF] text-white font-semibold"
                : "hover:bg-[#1A2141] hover:text-[#3BE3FD]"
            }`
          }
        >
          Аудит
        </NavLink>

        {/* Настройки */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md transition text-gray-300 ${
              isActive
                ? "bg-[#0052FF] text-white font-semibold"
                : "hover:bg-[#1A2141] hover:text-[#3BE3FD]"
            }`
          }
        >
          Настройки
        </NavLink>
      </nav>
    </div>
  );
}
