export type IncidentStatus =
  | "OPEN"
  | "INVESTIGATING"
  | "CLOSED";

// SOC actions — НЕ статус инцидента
export type IncidentAction =
  | "USER_BLOCKED"
  | "SESSION_ISOLATED"
  | "EXPORTED"
  | null;

export interface Incident {
  id: string;
  status: IncidentStatus;
  lastAction?: IncidentAction;
  createdAt: string;
}

export function createIncident(): Incident {
  return {
    id: crypto.randomUUID(),
    status: "OPEN",
    lastAction: null,
    createdAt: new Date().toISOString(),
  };
}
