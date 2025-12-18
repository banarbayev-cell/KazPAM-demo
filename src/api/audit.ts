// src/api/audit.ts

export interface AuditLog {
  id: number;
  created_at: string;
  user: string;
  action: string;
  category: string;
  details: any;
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const token = localStorage.getItem("access_token");

  const res = await fetch("http://127.0.0.1:8000/audit/logs", {
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("NO_ACCESS");
  }

  if (!res.ok) {
    throw new Error("FAILED_TO_LOAD");
  }

  return res.json();
}
