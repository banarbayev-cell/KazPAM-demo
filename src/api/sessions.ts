import { apiGet, apiPost } from "./client";

export const getSessions = () => {
  return apiGet("/sessions/sessions/");
};

export const startSession = (params: {
  user: string;
  system: string;
  os: string;
  ip: string;
  app?: string;
  mfa_passed?: boolean;
}) => {
  const query = new URLSearchParams({
    user: params.user,
    system: params.system,
    os: params.os,
    ip: params.ip,
    app: params.app ?? "SSH",
    mfa_passed: String(params.mfa_passed ?? false),
  });

  return apiPost(`/sessions/sessions/start?${query.toString()}`);
};

export const terminateSession = (id: number) => {
  return apiPost(`/sessions/sessions/terminate/${id}`);
};
