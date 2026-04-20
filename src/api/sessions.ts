import { apiGet, apiPost } from "./client";
import { apiDownload } from "../services/api";

export type StartSessionParams = {
  user: string;
  app?: string;
  mfa_passed?: boolean;
  target_id?: number;
  system?: string;
  os?: string;
  ip?: string;
  break_glass_requested?: boolean;
  break_glass_reason?: string;
};

export type StartSessionResponse = {
  id?: number;
  user?: string;
  system?: string;
  os?: string;
  ip?: string;
  app?: string;
  protocol?: string | null;
  status?: string;
  target_id?: number | null;
  vault_secret_id?: number | null;
  gateway_node?: string | null;
  launch_mode?: string | null;
  details?: string | null;
  pam_user?: string | null;
  start_time?: string;
};

export const getSessions = () => {
  return apiGet("/sessions/");
};

export const getAllSessions = (
  limit = 200,
  archived = false,
  status = "all"
) => {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  query.set("archived", String(archived));
  query.set("status", status);

  return apiGet(`/sessions/all?${query.toString()}`);
};

export const startSession = (
  params: StartSessionParams
): Promise<StartSessionResponse> => {
  const query = new URLSearchParams();

  const initiatorOrTargetUser = params.user?.trim();
  if (!initiatorOrTargetUser) {
    throw new Error("Не указан пользователь для запуска сессии");
  }

  query.set("user", initiatorOrTargetUser);
  query.set("app", params.app ?? "SSH");
  query.set("mfa_passed", String(params.mfa_passed ?? false));

  if (params.target_id !== undefined) {
    query.set("target_id", String(params.target_id));
  } else {
    const system = params.system?.trim();
    const os = params.os?.trim();
    const ip = params.ip?.trim();

    if (!system || !os || !ip) {
      throw new Error("Для ручного запуска нужны system, os и ip");
    }

    query.set("system", system);
    query.set("os", os);
    query.set("ip", ip);
  }

  if (params.break_glass_requested !== undefined) {
    query.set("break_glass_requested", String(params.break_glass_requested));
  }

  if (params.break_glass_reason?.trim()) {
    query.set("break_glass_reason", params.break_glass_reason.trim());
  }

  return apiPost(`/sessions/start?${query.toString()}`);
};

export const terminateSession = (id: number) => {
  return apiPost(`/sessions/terminate/${id}`);
};

export const archiveSession = (id: number) => {
  return apiPost(`/sessions/${id}/archive`);
};

export const exportSessions = (
  format: "csv" | "json",
  archived = false,
  status = "all"
) => {
  const query = new URLSearchParams();
  query.set("archived", String(archived));
  query.set("status", status);
  query.set("limit", "5000");

  return apiDownload(
    `/sessions/export/${format}?${query.toString()}`,
    format === "csv" ? "sessions_export.csv" : "sessions_export.json"
  );
};