// src/api/vaultRequests.ts
// KazPAM Vault Requests API
// ⚠️ Новый файл. Ничего не ломает существующий код.

import { api } from "../services/api";

/**
 * =====================================================
 * TYPES (минимум, строго под backend)
 * =====================================================
 */

export type VaultRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "DENIED"
  | "CANCELLED";

export interface VaultRequest {
  id: number;
  secret_id: number;
  requester: string;
  status: VaultRequestStatus;
  reason?: string | null;
  created_at?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  valid_until?: string | null;
}

/**
 * =====================================================
 * LIST REQUESTS
 * GET /vault/requests/?status=&mine=
 * =====================================================
 */
export async function listVaultRequests(params?: {
  status?: VaultRequestStatus;
  mine?: boolean;
}): Promise<VaultRequest[]> {
  const query = new URLSearchParams();

  if (params?.status) query.append("status", params.status);
  if (typeof params?.mine === "boolean")
    query.append("mine", String(params.mine));

  const qs = query.toString();
  const path = qs ? `/vault/requests/?${qs}` : `/vault/requests/`;

  return api.get<VaultRequest[]>(path);
}

/**
 * =====================================================
 * CREATE REQUEST
 * POST /vault/requests/
 * =====================================================
 */
export async function createVaultRequest(payload: {
  secret_id: number;
  reason?: string;
}): Promise<VaultRequest> {
  return api.post<VaultRequest>("/vault/requests/", payload);
}

/**
 * =====================================================
 * APPROVE REQUEST
 * POST /vault/requests/{id}/approve
 * =====================================================
 */
export async function approveVaultRequest(
  requestId: number,
  payload?: {
    comment?: string;
    grant_ttl_minutes?: number;
  }
): Promise<{
  ok: boolean;
  grant_id: number;
  valid_until: string;
}> {
  return api.post(`/vault/requests/${requestId}/approve`, payload);
}

/**
 * =====================================================
 * DENY REQUEST
 * POST /vault/requests/{id}/deny
 * =====================================================
 */
export async function denyVaultRequest(
  requestId: number,
  payload?: { comment?: string }
): Promise<{ ok: boolean }> {
  return api.post(`/vault/requests/${requestId}/deny`, payload);
}

/**
 * =====================================================
 * CANCEL REQUEST (requester)
 * POST /vault/requests/{id}/cancel
 * =====================================================
 */
export async function cancelVaultRequest(
  requestId: number
): Promise<{ ok: boolean }> {
  return api.post(`/vault/requests/${requestId}/cancel`);
}
