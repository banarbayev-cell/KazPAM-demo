import { Outlet } from "react-router-dom";
import Sidebar from "../components/ui/sidebar";

export default function AppLayout() {
  return (
    <div className="h-screen w-screen bg-gray-100 relative">
      {/* Sidebar — фиксируем слева */}
      <aside className="fixed left-0 top-0 h-screen w-64 z-50">
        <Sidebar />
      </aside>

      {/* Контент — с отступом слева */}
      <main className="ml-64 h-screen overflow-y-auto p-8 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
