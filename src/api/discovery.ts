import { api } from "../services/api";
import type {
  DiscoveredAccount,
  DiscoveryJob,
  DiscoveryMetadataUpdatePayload,
  DiscoveryRunRequest,
  DiscoveryTarget,
} from "../types/discovery";

export function listDiscoveryAccounts() {
  return api.get<DiscoveredAccount[]>("/discovery/accounts");
}

export function listDiscoveryTargets() {
  return api.get<DiscoveryTarget[]>("/discovery/targets");
}

export function listDiscoveryJobs() {
  return api.get<DiscoveryJob[]>("/discovery/jobs");
}

export function runDiscovery(payload: DiscoveryRunRequest) {
  return api.post<DiscoveryJob>("/discovery/run", payload);
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