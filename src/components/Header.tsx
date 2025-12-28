import { useState } from "react";
import { ChevronDown, User, Users, LogOut, Bell } from "lucide-react";
import ProfileModal from "./modals/ProfileModal";
import { useAuth } from "../store/auth";


export default function Header() {
  const logout = useAuth((s) => s.logout);

  const [open, setOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState("admin");
  const [avatar, setAvatar] = useState("A");



  return (
    <header className="w-full h-16 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-between px-6 relative">

      {/* LOGO */}
      <h1 className="text-xl font-bold mt-2 text-[var(--text-primary)]">
        Kaz<span className="text-[#0052FF]">PAM</span>
      </h1>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-6">

        {/* Bell */}
        <button className="relative hover:opacity-80 transition">
          <Bell size={22} className="text-[var(--text-primary)]" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* PROFILE */}
        <div className="relative">
          <button
            onClick={() => {
              setOpen(!open);
              setSwitchOpen(false);
            }}
            className="flex items-center gap-3 bg-[#0F1931] px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[#152244] transition"
          >
            {/* AVATAR */}
            <div className="w-9 h-9 bg-gray-700 text-white rounded-full flex items-center justify-center text-lg font-bold">
              {avatar}
            </div>

            {/* NAME */}
            <span className="font-semibold text-[var(--text-primary)]">{currentUser}</span>

            <ChevronDown
              size={18}
              className={`text-[var(--text-secondary)] transition ${open ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute top-16 right-0 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl p-2 animate-fadeIn z-50">

              <button
                onClick={() => setProfileOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#0F1931] text-[var(--text-secondary)]"
              >
                <User size={18} />
                Профиль
              </button>

              <div className="relative">
                <button
                  onClick={() => setSwitchOpen(!switchOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#0F1931] text-[var(--text-secondary)]"
                >
                  <span className="flex items-center gap-2">
                    <Users size={18} /> Сменить пользователя
                  </span>
                  <ChevronDown size={16} />
                </button>

                {switchOpen && (
                  <div className="mt-1 ml-6 w-40 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg animate-fadeIn">
                    {["admin", "security", "operator", "root"].map((u) => (
                      <button
                        key={u}
                        onClick={() => {
                          setCurrentUser(u);
                          setAvatar(u[0].toUpperCase());
                          setSwitchOpen(false);
                          setOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#0F1931] text-[var(--text-secondary)]"
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} user={currentUser} />
    </header>
  );
}
