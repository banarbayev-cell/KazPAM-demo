// src/api/vaultReveal.ts
import { api } from "@/services/api";

export async function revealSecretApproved(
  secretId: number,
  mfa_code: string
) {
  return api.post<{
    id: number;
    value: string;
  }>(`/vault/requests/secrets/${secretId}/reveal-approved`, {
    mfa_code,
  });
}
