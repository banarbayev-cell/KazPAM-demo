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
  const data = await api.get<unknown>("/recordings/");
  return Array.isArray(data) ? (data as Recording[]) : [];
}

export async function fetchRecordingEvents(
  recordingId: number
): Promise<{ from: string; to: string | null; events: RecordingEvent[] }> {
  const data = await api.get<any>(`/recordings/${recordingId}/events`);

  return {
    from: typeof data?.from === "string" ? data.from : "",
    to: typeof data?.to === "string" || data?.to === null ? data.to : null,
    events: Array.isArray(data?.events) ? (data.events as RecordingEvent[]) : [],
  };
}

export async function fetchRecordingMeta(
  recordingId: number
): Promise<RecordingMeta> {
  const data = await api.get<any>(`/recordings/${recordingId}/meta`);

  return {
    id: Number(data?.id ?? 0),
    session_id: Number(data?.session_id ?? 0),
    user: String(data?.user ?? ""),
    protocol: String(data?.protocol ?? ""),
    start_time: String(data?.start_time ?? ""),
    end_time: data?.end_time ?? null,
    duration: Number(data?.duration ?? 0),
    size: data?.size ?? null,
    status: (data?.status ?? "PROCESSING") as "READY" | "PROCESSING" | "FAILED",
  };
}