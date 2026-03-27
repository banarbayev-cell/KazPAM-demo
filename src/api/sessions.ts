import { apiGet, apiPost } from "./client";

export const getSessions = () => {
  return apiGet("/sessions/");
};

export const getAllSessions = () => {
  return apiGet("/sessions/all");
};

export const startSession = (params: {
  user?: string;
  system?: string;
  os?: string;
  ip?: string;
  app?: string;
  mfa_passed?: boolean;
  target_id?: number;
  break_glass_requested?: boolean;
  break_glass_reason?: string;
}) => {
  const query = new URLSearchParams();

  if (params.user !== undefined) query.set("user", params.user);
  if (params.system !== undefined) query.set("system", params.system);
  if (params.os !== undefined) query.set("os", params.os);
  if (params.ip !== undefined) query.set("ip", params.ip);

  query.set("app", params.app ?? "SSH");
  query.set("mfa_passed", String(params.mfa_passed ?? false));

  if (params.target_id !== undefined) {
    query.set("target_id", String(params.target_id));
  }

  if (params.break_glass_requested !== undefined) {
    query.set(
      "break_glass_requested",
      String(params.break_glass_requested)
    );
  }

  if (params.break_glass_reason !== undefined) {
    query.set("break_glass_reason", params.break_glass_reason);
  }

  return apiPost(`/sessions/start?${query.toString()}`);
};

export const terminateSession = (id: number) => {
  return apiPost(`/sessions/terminate/${id}`);
};