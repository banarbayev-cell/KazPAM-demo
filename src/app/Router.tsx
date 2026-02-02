// src/app/Router.tsx
import React from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import AuthGuard from "./AuthGuard";
import AppLayout from "../layout/AppLayout";

import Login from "../pages/Login";
import Home from "../pages/Home";
import Sessions from "../pages/Sessions";
import Audit from "../pages/Audit";
import Permissions from "../pages/Permissions";
import SocDashboard from "../pages/SocDashboard";
import SettingsPage from "../pages/Settings";
import Access from "../components/Access";
import IncidentDetails from "../pages/IncidentDetails";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },

  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <Home /> },
          { path: "/soc", element: <SocDashboard /> },
          { path: "/sessions", element: <Sessions /> },
          { path: "/audit", element: <Audit /> },
          { path: "/permissions", element: <Permissions /> },
          { path: "/incidents/:id", element: <IncidentDetails /> },

          // ✅ SETTINGS С RBAC
          {
            path: "/settings",
            element: (
              <Access permission="view_settings">
                <SettingsPage />
              </Access>
            ),
          },
        ],
      },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}