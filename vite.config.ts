import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Мы это сохранили, чтобы импорты не сломались
    },
  },
  server: {
    hmr: {
      overlay: false,
    },
    // ДОБАВЛЕНО: Настройка прокси для связи с боевым сервером
    proxy: {
      '/api': {
        target: 'https://server.kazpam.kz', // Куда отправляем запросы
        changeOrigin: true, // "Обманываем" сервер, притворяясь своим
        secure: false,      // Разрешаем HTTPS
      }
    }
  },
});