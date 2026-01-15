export type IncidentStatus =
  | "OPEN"
  | "INVESTIGATING"
  | "CLOSED"
  | "RESOLVED"; // backend-compatible

export interface IncidentAction {
  type:
    | "SOC_ISOLATE_SESSION"
    | "SOC_BLOCK_USER"
    | "SOC_EXPORT";
  actor: string;
  timestamp: string;
  result: "SUCCESS" | "FAILED";
}

export interface IncidentComment {
  author: string;        // "soc", "system", etc
  message: string;
  timestamp: string;
}

export interface Incident {
  id: string;               // frontend UUID
  backendId?: number;       // ID из БД (optional)
  status: IncidentStatus;

  createdAt: string;
  closedAt?: string;        // <-- ДОБАВИЛИ

  // SOC details
  actions?: IncidentAction[];
  comments?: IncidentComment[];

  // UI helper (не источник истины)
  lastAction?: string | null;
}

export function createIncident(): Incident {
  return {
    id: crypto.randomUUID(),
    status: "OPEN",
    createdAt: new Date().toISOString(),
    actions: [],
    comments: [],
    lastAction: null,
  };
}
