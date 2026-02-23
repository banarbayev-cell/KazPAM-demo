// src/api/license.ts
import { api } from "../services/api";

export type LicenseInfo = {
  customer: string;
  max_users: number;
  used_users: number;
  expires_at: string; // ISO
  expired: boolean;
  features: string[];
};

export async function fetchLicenseInfo(): Promise<LicenseInfo> {
  // endpoint у тебя: GET /license/info (NGINX проксирует /api/*)
  return api.get<LicenseInfo>("/license/info");
}