import { Link, Route, Routes, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Users from "./pages/Users";
import Sessions from "./pages/Sessions";
import Vault from "./pages/Vault";
import Audit from "./pages/Audit";
import SessionReplay from "./pages/SessionReplay";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";

import {
  Home as HomeIcon,
  Users as UsersIcon,
  Monitor,
  PlaySquare,
  FolderLock,
  FileSearch,
  Settings,
  LogOut,
} from "lucide-react";

export default function App() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Главная", icon: <HomeIcon size={22} /> },
    { path: "/users", label: "Пользователи", icon: <UsersIcon size={22} /> },
    { path: "/sessions", label: "Сессии", icon: <Monitor size={22} /> },
    { path: "/replay", label: "Записи сессий", icon: <PlaySquare size={22} /> },
    { path: "/vault", label: "Хранилище", icon: <FolderLock size={22} /> },
    { path: "/audit", label: "Аудит", icon: <FileSearch size={22} /> },
    { path: "/settings", label: "Настройки", icon: <Settings size={22} /> },
  ];

  // если мы на странице login — скрываем sidebar
  if (location.pathname === "/login") {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-900 text-white p-6 flex flex-col shadow-xl">
        <h1 className="text-3xl font-bold mb-12 tracking-wide">KazPAM</h1>

        <nav className="flex flex-col gap-3 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-6 p-4 rounded-lg text-lg transition-all
                ${
                  location.pathname === item.path
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-800 text-gray-300"
                }`}
            >
              <span className="min-w-[28px] flex justify-center text-gray-200">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <button className="flex items-center gap-6 p-4 rounded-lg mt-10 hover:bg-red-600 transition text-gray-300 text-lg">
          <span className="min-w-[28px] flex justify-center">
            <LogOut size={22} />
          </span>
          <span>Выйти</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/users" element={<Users />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/replay" element={<SessionReplay />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
}
