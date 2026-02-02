// src/api/recordings.ts
import { api } from "../services/api";

export interface Recording {
  id: number;
  user: string;
  protocol: string;
  date: string;
  duration: number; // seconds
  size: number | null;
  status: "READY" | "PROCESSING" | "FAILED";
}

export interface RecordingEvent {
  ts: string;
  type: string;
  text: string;
}

export async function fetchRecordings(): Promise<Recording[]> {
  return api.get("/recordings");
}

export async function fetchRecordingEvents(
  recordingId: number
): Promise<{ from: string; to: string; events: RecordingEvent[] }> {
  return api.get(`/recordings/${recordingId}/events`);
}
