import { api } from "../services/api";
import type {
  DiscoveredAccount,
  DiscoveryAccountStatusUpdatePayload,
  DiscoveryJob,
  DiscoveryMetadataUpdatePayload,
  DiscoveryRunRequest,
  DiscoveryTarget,
  DiscoveryTargetCreatePayload,
  DiscoveryTargetUpdatePayload,
} from "../types/discovery";

export function listDiscoveryAccounts() {
  return api.get<DiscoveredAccount[]>("/discovery/accounts");
}

export function listDiscoveryTargets() {
  return api.get<DiscoveryTarget[]>("/discovery/targets");
}

export function createDiscoveryTarget(payload: DiscoveryTargetCreatePayload) {
  return api.post<DiscoveryTarget>("/discovery/targets", payload);
}

export function updateDiscoveryTarget(
  targetId: number,
  payload: DiscoveryTargetUpdatePayload
) {
  return api.patch<DiscoveryTarget>(`/discovery/targets/${targetId}`, payload);
}

export function deleteDiscoveryTarget(targetId: number) {
  return api.delete<{ ok: boolean }>(`/discovery/targets/${targetId}`);
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

export function updateDiscoveryAccountStatus(
  accountId: number,
  payload: DiscoveryAccountStatusUpdatePayload
) {
  return api.patch<DiscoveredAccount>(
    `/discovery/accounts/${accountId}/status`,
    payload
  );
}