// src/layout/AppLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#0A0F24] text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Outlet />
      </div>
    </div>
  );
}
