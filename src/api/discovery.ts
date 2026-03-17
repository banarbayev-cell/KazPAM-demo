import { api } from "../services/api";
import type {
  DiscoveredAccount,
  DiscoveryMetadataUpdatePayload,
} from "../types/discovery";

export function listDiscoveryAccounts() {
  return api.get<DiscoveredAccount[]>("/discovery/accounts");
}

export function updateDiscoveryAccountMetadata(
  accountId: number,
  payload: DiscoveryMetadataUpdatePayload
) {
  return api.patch<DiscoveredAccount>(
    `/discovery/accounts/${accountId}/metadata`,
    payload
  );
}

export function onboardDiscoveryAccount(accountId: number) {
  return api.post<DiscoveredAccount>(`/discovery/accounts/${accountId}/onboard`);
}