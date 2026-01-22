import { Outlet } from "react-router-dom";
import Sidebar from "../components/ui/sidebar";
import Header from "../components/Header";
import { useNotificationsSocket } from "../hooks/useNotificationsSocket";

export default function DashboardLayout() {
  // 🔔 realtime notifications (WS)
  useNotificationsSocket();

  return (
    <div className="flex h-screen bg-white text-[var(--text)]">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 overflow-y-auto bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
