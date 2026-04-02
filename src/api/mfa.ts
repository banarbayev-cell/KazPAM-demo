import { api } from "../services/api";

export interface MfaStatus {
  mfa_enabled: boolean;
  mfa_method?: string | null;
  pending_setup: boolean;
}

export interface MfaEnableResponse {
  secret: string;
  otpauth_uri: string;
  method: string;
}

export const mfaApi = {
  getStatus: () => api.get<MfaStatus>("/mfa/status"),

  enableTotp: () => api.post<MfaEnableResponse>("/mfa/enable"),

  verify: (code: string, method: "totp" | "email" = "totp") =>
    api.post("/mfa/verify", { code, method }),

  sendEmailCode: () => api.post("/mfa/email/send"),
};