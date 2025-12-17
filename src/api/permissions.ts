// src/api/permissions.ts

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

// ===============================
// Permissions
// ===============================

export async function fetchPermissions() {
  const res = await fetch(`${API_URL}/permissions/`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch permissions");
  }

  return res.json();
}

// ===============================
// Role ↔ Permission (ВАЖНО: /permissions/...)
// ===============================

export async function addPermissionToRole(
  roleId: number,
  permissionId: number
) {
  const res = await fetch(
    `${API_URL}/permissions/${roleId}/add/${permissionId}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to add permission to role");
  }

  return res.json();
}

export async function removePermissionFromRole(
  roleId: number,
  permissionId: number
) {
  const res = await fetch(
    `${API_URL}/permissions/${roleId}/remove/${permissionId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to remove permission from role");
  }

  return res.json();
}
