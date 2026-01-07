import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import Login from "./pages/Login";
import DashboardLayout from "./layouts/dashboard-layout";

import Home from "./pages/Home";
import SocDashboard from "./pages/SocDashboard";
import Users from "./pages/Users";
import Sessions from "./pages/Sessions";
import Audit from "./pages/Audit";
import Settings from "./pages/Settings";
import Vault from "./pages/Vault";
import Policies from "./pages/Policies";
import Roles from "./pages/Roles";
import Permissions from "./pages/Permissions";

import { useAuth } from "./store/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

export default function App() {
  const loadFromStorage = useAuth((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <>
      <Toaster richColors closeButton position="top-right" />

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

          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<Home />} />
          <Route path="soc" element={<SocDashboard />} />

          <Route path="users" element={<Users />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="vault" element={<Vault />} />
          <Route path="policies" element={<Policies />} />
          <Route path="audit" element={<Audit />} />
          <Route path="settings" element={<Settings />} />
          <Route path="roles" element={<Roles />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
