import { api } from "../services/api";

export type SocCommandSeverity = "low" | "medium" | "high";

export interface SocCommand {
  time: string;
  command: string;
  session_id: number;
  user: string;
  system: string;
  recording_id: number;
  severity?: SocCommandSeverity;
  risk_score?: number;
  risk_reason?: string;
}

export async function fetchSocCommands(): Promise<SocCommand[]> {
  return api.get("/soc/session-commands");
}