export async function apiGet(path: string) {
  const token = localStorage.getItem("access_token"); // <-- ЧИТАЕМ ТОКЕН

  const res = await fetch(`http://127.0.0.1:8000${path}`, {
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
