import axios from "axios";

export function logout() {
  // 1. Удаляем токен (КЛЮЧЕВО)
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  localStorage.removeItem("roles");
  localStorage.removeItem("permissions");

  // 2. Чистим axios
  delete axios.defaults.headers.common["Authorization"];

  // 3. ЖЁСТКИЙ редирект
  window.location.href = "/login";
}
