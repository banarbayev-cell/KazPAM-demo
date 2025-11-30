/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  // Включаем режим совместимости Tailwind v3
  future: {
    hoverOnlyWhenSupported: true,
  },
  compatibility: "3.4",
};
