import { Bell, LogOut, User, Users } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../store/auth";

export default function Header() {
  const logout = useAuthStore((state) => state.logout);
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full h-16 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-between px-6 relative">
      {/* Title */}
      <div className="text-xl font-bold text-[var(--neon)] tracking-wide">
        KazPAM
      </div>

      {/* Right section */}
      <div className="flex items-center gap-6">

        {/* Notifications */}
        <button className="relative">
          <Bell size={22} className="text-[var(--text-secondary)] hover:text-[var(--neon)]" />
          <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-[10px] px-1">
            3
          </span>
        </button>

        {/* Avatar + dropdown */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          <img
            src="https://i.pravatar.cc/40"
            alt="User"
            className="w-9 h-9 rounded-full border border-[var(--border)]"
          />
          <span className="font-medium text-[var(--text)]">Администратор</span>
        </div>

        {/* Dropdown menu */}
        {open && (
          <div className="absolute top-16 right-6 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl p-2 animate-fadeIn z-50">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#0F1931] text-[var(--text-secondary)]">
              <User size={18} />
              Профиль
            </button>

            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#0F1931] text-[var(--text-secondary)]">
              <Users size={18} />
              Сменить пользователя
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-900/30 text-red-500 font-semibold"
            >
              <LogOut size={18} />
              Выйти
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
