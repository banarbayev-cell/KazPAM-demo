// src/components/Header.tsx
import { useState } from "react";
import { ChevronDown, User, LogOut } from "lucide-react";
import NotificationsDropdown from "./Notifications/NotificationsDropdown";
import ProfileModal from "./modals/ProfileModal";
import { useAuth } from "../store/auth";

export default function Header() {
  const logout = useAuth((s) => s.logout);
  const user = useAuth((s) => s.user); // ⬅ источник истины

  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const displayName =
    user?.email || user?.username || "user";

  const avatar =
    displayName?.[0]?.toUpperCase() || "U";

  return (
    <header className="w-full h-16 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-between px-6 relative">
      {/* LOGO */}
      <h1 className="text-xl font-bold mt-2 text-[var(--text-primary)]">
        Kaz<span className="text-[#0052FF]">PAM</span>
      </h1>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <NotificationsDropdown />

        {/* PROFILE */}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 bg-[#0F1931] px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[#152244] transition"
          >
            {/* AVATAR */}
            <div className="w-9 h-9 bg-gray-700 text-white rounded-full flex items-center justify-center text-lg font-bold">
              {avatar}
            </div>

            {/* NAME */}
            <span className="font-semibold text-[var(--text-primary)]">
              {displayName}
            </span>

            <ChevronDown
              size={18}
              className={`text-[var(--text-secondary)] transition ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute top-16 right-0 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl p-2 animate-fadeIn z-50">
              <button
                onClick={() => {
                  setProfileOpen(true);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#0F1931] text-[var(--text-secondary)]"
              >
                <User size={18} />
                Профиль
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
      </div>

      {/* Profile modal */}
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
      />
    </header>
  );
}
