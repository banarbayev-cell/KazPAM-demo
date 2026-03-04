import { useState, useEffect } from "react";
import {
  ChevronDown,
  User,
  LogOut,
  Key,
  ShieldCheck,
  Activity,
  AlertTriangle,
} from "lucide-react";

import { useLocation } from "react-router-dom";

import NotificationsDropdown from "./Notifications/NotificationsDropdown";
import ProfileModal from "./modals/ProfileModal";
import ChangePasswordModal from "./modals/ChangePasswordModal";

import { useAuth } from "../store/auth";
import { API_URL } from "../api/config";

export default function Header() {
  const logout = useAuth((s) => s.logout);
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);

  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [activeSessions, setActiveSessions] = useState(0);

  const [passwordChanged, setPasswordChanged] = useState(false);

  const displayName = user?.email || "user";
  const avatar = displayName?.[0]?.toUpperCase() || "U";

  // PAM MODE DETECTION
  const privilegedRoutes = [
    "/vault",
    "/sessions",
    "/recordings",
    "/incidents",
  ];

  const isPrivileged = privilegedRoutes.some((r) =>
    location.pathname.startsWith(r)
  );

  // SESSION START PERSIST
  useEffect(() => {
    const stored = localStorage.getItem("kazpam_session_start");

    if (!stored) {
      localStorage.setItem("kazpam_session_start", Date.now().toString());
    }
  }, []);

  // SESSION TIMER
  useEffect(() => {
    const updateTimer = () => {
      const stored = localStorage.getItem("kazpam_session_start");

      if (!stored) return;

      const minutes = Math.floor((Date.now() - Number(stored)) / 60000);
      setSessionMinutes(minutes);
    };

    updateTimer();

    const i = setInterval(updateTimer, 60000);

    return () => clearInterval(i);
  }, []);

  // ACTIVE SESSIONS
  useEffect(() => {
    if (!token) return;

    const loadSessions = async () => {
      try {
        const res = await fetch(`${API_URL}/sessions/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const data = await res.json();

        if (typeof data.active_sessions === "number") {
          setActiveSessions(data.active_sessions);
        }
      } catch {}
    };

    loadSessions();

    const i = setInterval(loadSessions, 20000);

    return () => clearInterval(i);
  }, [token]);

  // SUCCESS TOAST
  useEffect(() => {
    if (!passwordChanged) return;

    const t = setTimeout(() => {
      setPasswordChanged(false);
    }, 3000);

    return () => clearTimeout(t);
  }, [passwordChanged]);

  const handleLogout = () => {
    localStorage.removeItem("kazpam_session_start");
    logout();
  };

  return (
    <>
      <header className="w-full bg-[var(--bg-card)] border-b border-[var(--border)] flex flex-col">

        {/* SECURITY STATUS BAR */}

        <div
          className={`w-full text-xs flex items-center justify-between px-6 py-1 border-b
          ${
            isPrivileged
              ? "bg-red-900 border-red-700 text-red-200"
              : "bg-[#081025] border-[#16223f] text-blue-300"
          }`}
        >
          <div className="flex items-center gap-4">

            {isPrivileged ? (
              <>
                <AlertTriangle size={14} />
                <span className="font-semibold">
                  Privileged Access Mode
                </span>
              </>
            ) : (
              <>
                <ShieldCheck size={14} className="text-green-400" />
                <span className="text-green-400 font-semibold">
                  Zero Trust Session Active
                </span>
              </>
            )}

            <div className="flex items-center gap-2 text-cyan-300">
              <Activity size={14} />
              Active Sessions: {activeSessions}
            </div>
          </div>

          <div className="text-[11px]">
            Session Time: {sessionMinutes}m
          </div>
        </div>

        {/* MAIN HEADER */}

        <div className="w-full h-16 flex items-center justify-between px-6 relative">

          <h1 className="text-xl font-bold mt-2 text-[var(--text-primary)]">
            Kaz<span className="text-[#0052FF]">PAM</span>
          </h1>

          <div className="flex items-center gap-6">

            <div className="hidden md:flex items-center gap-2 text-xs text-green-400 bg-green-900/30 border border-green-700 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Secure Session · {sessionMinutes}m
            </div>

            <NotificationsDropdown />

            <div className="relative">
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-3 bg-[#0F1931] px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[#152244] transition"
              >
                <div className="w-9 h-9 bg-gray-700 text-white rounded-full flex items-center justify-center text-lg font-bold">
                  {avatar}
                </div>

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

              {open && (
                <div className="absolute top-16 right-0 w-64 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl p-2 animate-fadeIn z-[9999]">

                  <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {displayName}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Privileged user
                    </div>
                  </div>

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
                    onClick={() => {
                      setPasswordOpen(true);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#0F1931] text-[var(--text-secondary)]"
                  >
                    <Key size={18} />
                    Сменить пароль
                  </button>

                  <div className="border-t border-[var(--border)] my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-900/30 text-red-500 font-semibold"
                  >
                    <LogOut size={18} />
                    Выйти
                  </button>

                </div>
              )}
            </div>
          </div>

          {passwordChanged && (
            <div className="absolute right-6 top-20 bg-green-900 border border-green-600 text-green-300 px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeIn">
              Пароль успешно сменён
            </div>
          )}
        </div>
      </header>

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
      />

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => {
          setPasswordOpen(false);
          setPasswordChanged(true);
        }}
      />
    </>
  );
}