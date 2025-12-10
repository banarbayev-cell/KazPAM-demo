import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import DashboardLayout from "./layouts/dashboard-layout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Sessions from "./pages/Sessions";
import Audit from "./pages/Audit";
import Settings from "./pages/Settings";
import Vault from "./pages/Vault";
import Policies from "./pages/Policies";
import Roles from "./pages/Roles";

import ProtectedRoute from "./components/ProtectedRoute";

// 🔥 Добавляем
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      {/* Глобальные уведомления */}
      <Toaster
        richColors
        closeButton
        position="top-right"
      />

      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="vault" element={<Vault />} />
          <Route path="policies" element={<Policies />} />
          <Route path="audit" element={<Audit />} />
          <Route path="settings" element={<Settings />} />
          <Route path="roles" element={<Roles />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </>
  );
}
