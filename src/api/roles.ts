import { API_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function deleteRole(roleId: number) {
  const res = await fetch(`${API_URL}/roles/${roleId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete role");
  }

  return res.json();
}
