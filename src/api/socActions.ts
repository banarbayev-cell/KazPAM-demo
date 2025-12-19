const API_URL = import.meta.env.VITE_API_URL;

function authHeaders() {
  return {
    Authorization: "Bearer " + localStorage.getItem("access_token"),
    "Content-Type": "application/json",
  };
}

export async function blockUser(user: string) {
  const res = await fetch(`${API_URL}/soc/actions/block-user`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ user }),
  });

  if (!res.ok) throw new Error("BLOCK_FAILED");
  return res.json();
}

export async function isolateSession(user: string) {
  const res = await fetch(`${API_URL}/soc/actions/isolate-session`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ user }),
  });

  if (!res.ok) throw new Error("ISOLATE_FAILED");
  return res.json();
}
