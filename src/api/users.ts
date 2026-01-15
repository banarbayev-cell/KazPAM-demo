import { API_URL } from "./config";

export async function fetchMe(token: string) {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch /users/me");
  }

  return res.json();
}
