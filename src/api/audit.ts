// src/api/audit.ts

import { api } from "../services/api";

export interface AuditLog {
  id: number;
  created_at: string;
  user: string;
  action: string;
  category: string;
  details: any;
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  // ВАЖНО:
  // - api.get уже:
  //   - добавляет Authorization
  //   - обрабатывает 401 / 403
  //   - делает response.json()
  // Поэтому здесь НЕЛЬЗЯ обращаться к res.status / res.ok / res.json()

  return api.get<AuditLog[]>("/audit/logs");
}
