/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // добавляй сюда другие переменные
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
