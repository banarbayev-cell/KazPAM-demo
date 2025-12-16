// src/app/Router.tsx
import React from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import AuthGuard from "@/app/AuthGuard";
import AppLayout from "@/layout/AppLayout";

// Pages (создай заглушки, если страниц пока нет)
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Sessions from "@/pages/Sessions";
import Audit from "@/pages/Audit";

const router = createBrowserRouter([
  // Публичная зона
  { path: "/login", element: <Login /> },

  // Приватная зона
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/sessions", element: <Sessions /> },
          { path: "/audit", element: <Audit /> },
        ],
      },
    ],
  },

  // Фолбек
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
