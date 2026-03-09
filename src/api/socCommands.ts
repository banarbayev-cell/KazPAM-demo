import { api } from "../services/api";

export interface SocCommand {
  time: string
  command: string
  session_id: number
  user: string
  system: string
  recording_id: number
}

export async function fetchSocCommands(): Promise<SocCommand[]> {
  return api.get("/soc/session-commands")
}