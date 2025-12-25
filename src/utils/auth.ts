import axios from "axios";

/**
 * KazPAM Dashboard — Auth utils (эталон).
 *
 * Правило безопасности:
 * - logout НЕ должен зависеть от сети/бекэнда.
 * - Любые внешние вызовы (audit) — best-effort.
 *
 * Источник истины по auth:
 * - access_token в localStorage.
 */

function clearAuthStorage() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  localStorage.removeItem("roles");
  localStorage.removeItem("permissions");
}

/**
 * Best-effort запись события LOGOUT на backend.
 * Если endpoint отсутствует/упал/нет сети — игнорируем.
 *
 * Важно:
 * - Вызываем ДО удаления access_token, чтобы Authorization header ещё был доступен.
 * - Не используем toast/alert здесь: logout должен быть "немой" и надёжный.
 */
async function tryAuditLogout(): Promise<void> {
  try {
    // Если токена нет — нечего аудитить (и так не авторизован)
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // На случай если axios не проставляет header автоматически:
    // (не ломает существующий код, просто подстраховка)
    const headers: Record<string, string> = {};
    if (!axios.defaults.headers.common["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Endpoint должен быть добавлен на backend (auth_router.py): POST /auth/logout
    await axios.post("/auth/logout", null, { headers });
  } catch {
    // best-effort: игнорируем любые ошибки
  }
}

/**
 * Logout: best-effort audit -> local cleanup -> hard redirect.
 * Критично: не превращаем функцию в async для вызывающих мест.
 * Поэтому используем IIFE (самовызываемую async-функцию).
 */
export function logout(): void {
  (async () => {
    // 1) Best-effort audit (не блокирует выход)
    await tryAuditLogout();

    // 2) Локальный выход — КРИТИЧНО и обязательно
    clearAuthStorage();

    // 3) Чистим axios (на случай кэша заголовков)
    try {
      delete axios.defaults.headers.common["Authorization"];
    } catch {
      // ничего
    }

    // 4) Жёсткий редирект
    window.location.href = "/login";
  })();
}
