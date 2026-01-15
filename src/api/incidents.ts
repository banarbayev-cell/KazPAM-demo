// src/api/incidents.ts
import { API_URL } from "./config";
import { useAuth } from "../store/auth";

/**
 * Update incident status (backend-persisted)
 * Canonical SOC endpoint
 */
export async function updateIncidentStatus(
  incidentId: number,
  status: "RESOLVED" | "OPEN" | "INVESTIGATING"
) {
  const token = useAuth.getState().token;

  if (!token) {
    throw new Error("No auth token found");
  }

  const res = await fetch(
    `${API_URL}/incidents/${incidentId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update incident status: ${text}`);
  }

  return res.json();
}
