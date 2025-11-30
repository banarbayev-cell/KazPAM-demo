import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-[#0A0F24] text-white flex flex-col p-6 border-r border-white/10">
      <h1 className="text-3xl font-bold mb-10">
        Kaz<span className="text-[#0052FF]">PAM</span>
      </h1>

      <nav className="space-y-2">
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
