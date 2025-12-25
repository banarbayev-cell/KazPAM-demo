export async function apiGet(path: string) {
  const token = localStorage.getItem("access_token"); // <-- ЧИТАЕМ ТОКЕН

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }

  return res.json();
}
export async function apiPost(path: string, body?: any) {
  const token = localStorage.getItem("access_token");

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API Error: ${res.status}`);
  }

  return res.json();
}
