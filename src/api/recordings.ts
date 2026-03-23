// src/api/recordings.ts
import { api } from "../services/api";

export interface Recording {
  id: number;
  user: string;
  protocol: string;
  date: string;
  duration: number;
  size: number | null;
  status: "READY" | "PROCESSING" | "FAILED";
}

export interface RecordingEvent {
  ts: string;
  type: string;
  text: string;
}

export interface RecordingMeta {
  id: number;
  session_id: number;
  user: string;
  protocol: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  size: number | null;
  status: "READY" | "PROCESSING" | "FAILED";
}

export async function fetchRecordings(): Promise<Recording[]> {
  return api.get("/recordings");
}

export async function fetchRecordingEvents(
  recordingId: number
): Promise<{ from: string; to: string | null; events: RecordingEvent[] }> {
  return api.get(`/recordings/${recordingId}/events`);
}

export async function fetchRecordingMeta(
  recordingId: number
): Promise<RecordingMeta> {
  return api.get(`/recordings/${recordingId}/meta`);
}