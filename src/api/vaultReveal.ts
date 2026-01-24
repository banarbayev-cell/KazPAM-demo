import { api } from "@/services/api";

type RevealResponse = { id: number; value: string };

export async function revealSecretApproved(secretId: number, mfa_code: string): Promise<RevealResponse> {
  // Предполагаем, что api.post уже возвращает data (как в других местах проекта).
  // Если когда-то api станет возвращать AxiosResponse — поменяем в одном месте.
  return api.post<RevealResponse>(`/vault/requests/secrets/${secretId}/reveal-approved`, { mfa_code });
}