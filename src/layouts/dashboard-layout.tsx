import { Outlet } from "react-router-dom";
import Sidebar from "../components/ui/Sidebar";
import Header from "../components/Header";

export default function DashboardLayout() {
  console.log("🔥 VITE_API_URL =", import.meta.env.VITE_API_URL);

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
