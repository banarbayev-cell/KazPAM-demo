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
import IncidentDetails from "../pages/IncidentDetails";
import Access from "../components/Access";

import Recordings from "../pages/Recordings";
import SessionReplay from "../pages/SessionReplay";
import Policies from "../pages/Policies";


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
          { path: "/policies", element: <Policies /> },
          { path: "/soc", element: <SocDashboard /> },
          { path: "/sessions", element: <Sessions /> },
          { path: "/audit", element: <Audit /> },
          { path: "/permissions", element: <Permissions /> },
          { path: "/incidents/:id", element: <IncidentDetails /> },

          // ✅ RECORDINGS
          { path: "/recordings", element: <Recordings /> },
          { path: "/recordings/:id", element: <SessionReplay /> },

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
