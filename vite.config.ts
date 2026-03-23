import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "https://server.kazpam.kz",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});