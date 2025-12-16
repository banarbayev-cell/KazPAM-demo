// src/app/AuthGuard.tsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated } from "@/auth/token";

export default function AuthGuard() {
  const location = useLocation();

  // Без токена — на логин, сохраняя откуда пришёл
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
