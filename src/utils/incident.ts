export type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED";

export interface Incident {
  id: string;
  status: IncidentStatus;
  createdAt: string;
}

export function createIncident(): Incident {
  const timestamp = Date.now();
  const id = `INC-${new Date().getFullYear()}-${timestamp
    .toString()
    .slice(-6)}`;

  return {
    id,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  };
}
