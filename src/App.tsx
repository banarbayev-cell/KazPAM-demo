// src/App.tsx
import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import Login from "./pages/Login";
import DashboardLayout from "./layouts/dashboard-layout";

import Home from "./pages/Home";
import SocDashboard from "./pages/SocDashboard";
import SocCommands from "./pages/SocCommands";
import Users from "./pages/Users";
import Sessions from "./pages/Sessions";
import Audit from "./pages/Audit";
import Settings from "./pages/Settings";
import Vault from "./pages/Vault";
import VaultRequests from "./pages/VaultRequests";
import Policies from "./pages/Policies";
import Roles from "./pages/Roles";
import Permissions from "./pages/Permissions";
import Discovery from "./pages/Discovery";

import { useAuth } from "./store/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import ForceChangePassword from "@/pages/ForceChangePassword";
import License from "./pages/License";
import Access from "./components/Access";
import IncidentDetails from "./pages/IncidentDetails";
import Targets from "./pages/Targets";

export default function App() {
  const loadFromStorage = useAuth((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <>
      <Toaster richColors closeButton position="top-right" />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Force password change */}
        <Route
          path="/force-change-password"
          element={
            <ProtectedRoute>
              <ForceChangePassword />
            </ProtectedRoute>
          }
        />

        {/* Protected layout */}
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
          <Route path="soc/commands" element={<SocCommands />} />
          <Route path="soc/incidents/:id" element={<IncidentDetails />} />
          <Route path="users" element={<Users />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="discovery" element={<Discovery />} />
          <Route path="targets" element={<Targets />} />
          <Route path="vault" element={<Vault />} />
          <Route path="vault/requests" element={<VaultRequests />} />
          <Route path="policies" element={<Policies />} />
          <Route path="audit" element={<Audit />} />
          <Route path="settings" element={<Settings />} />
          <Route path="roles" element={<Roles />} />
          <Route path="permissions" element={<Permissions />} />
          <Route
            path="license"
            element={
              <Access permission="view_settings">
                <License />
              </Access>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}