// src/components/modals/EffectivePermissionsModal.tsx

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildEffectivePermissions,
  EffectivePermission,
} from "../../utils/effectivePermissions";
import StatusChip from "../ui/StatusChip";
import SourceTooltip from "../ui/SourceTooltip";


/* ================= TYPES ================= */

type PermissionLike = { code: string; description?: string };

type PolicyLike = {
  id?: number | string;
  name?: string;
  title?: string;
  permissions?: PermissionLike[];
};

type RoleLike = {
  id?: number | string;
  name?: string;
  policies?: PolicyLike[];
};

type UserLike = {
  id?: number | string;
  email?: string;
  full_name?: string;
  roles?: RoleLike[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: UserLike | null;
  allPermissions?: PermissionLike[];
  loading?: boolean;
};

/* ================= EXPLAINABILITY ================= */

function explainGranted(p: EffectivePermission): string {
  if (p.roles.length === 1 && p.policies.length === 0) {
    return `Предоставлено через роль «${p.roles[0]}».`;
  }
  if (p.roles.length === 1 && p.policies.length > 0) {
    return `Предоставлено через роль «${p.roles[0]}», политика: ${p.policies.join(", ")}.`;
  }
  if (p.roles.length > 1 && p.policies.length === 0) {
    return `Предоставлено через роли: ${p.roles.join(", ")}.`;
  }
  if (p.roles.length > 1 && p.policies.length > 0) {
    return `Предоставлено через роли: ${p.roles.join(", ")}, политики: ${p.policies.join(", ")}.`;
  }
  return "Предоставлено системой управления доступами.";
}

function explainDenied(
  p: EffectivePermission,
  opts: { userRoles: string[]; showDenied: boolean; hasAllPermissions: boolean }
): string {
  const { userRoles, showDenied, hasAllPermissions } = opts;

  if (!showDenied) {
    return "Denied скрыт. Включите «Показывать Denied».";
  }
  if (!hasAllPermissions) {
    return "Denied недоступен: справочник permissions (allPermissions) не загружен.";
  }
  if (userRoles.length === 0) {
    return "Право отсутствует, так как пользователю не назначены роли.";
  }
  return `Право отсутствует во всех ролях пользователя (${userRoles.join(", ")}).`;
}

/* ================= COMPONENT ================= */

export default function EffectivePermissionsModal({
  isOpen,
  onClose,
  user,
  allPermissions,
  loading = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [showDenied, setShowDenied] = useState(false);
  const [groupByRole, setGroupByRole] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const roles = user?.roles || [];

  const userRoleNames = useMemo(
    () => roles.map((r) => (r?.name || "").trim()).filter(Boolean),
    [roles]
  );

  const hasAllPermissions = Boolean(allPermissions && allPermissions.length > 0);

  const effective = useMemo(
    () =>
      buildEffectivePermissions({
        roles,
        allPermissions: showDenied ? allPermissions : undefined,
      }),
    [roles, allPermissions, showDenied]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return effective;

    return effective.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        p.roles.join(" ").toLowerCase().includes(q) ||
        p.policies.join(" ").toLowerCase().includes(q)
    );
  }, [effective, query]);

  const stats = useMemo(() => {
    const granted = effective.filter((p) => p.granted).length;
    return {
      granted,
      denied: effective.length - granted,
      roles: userRoleNames.length,
    };
  }, [effective, userRoleNames]);

  const groupedByRole = useMemo(() => {
    const map = new Map<string, EffectivePermission[]>();

    for (const perm of filtered) {
      if (!perm.granted) continue;

      for (const role of perm.roles) {
        if (!map.has(role)) map.set(role, []);
        map.get(role)!.push(perm);
      }
    }

    for (const perms of map.values()) {
      perms.sort((a, b) => a.code.localeCompare(b.code));
    }

    return Array.from(map.entries());
  }, [filtered]);

  if (!isOpen || !mounted) return null;

  const titleUser = user?.email || user?.full_name || "Пользователь";

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-black/60"
        onMouseDown={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl border border-[#1E2A45] bg-[#121A33] shadow-2xl flex flex-col"
          onMouseDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-[#1E2A45] px-6 py-5 shrink-0">
            <div>
              <div className="text-lg font-semibold text-white">
                Эффективные права
              </div>
              <div className="mt-1 text-sm text-gray-300">{titleUser}</div>
              <div className="mt-2 text-xs text-gray-400">
                Read-only. Права агрегируются из ролей → политик → permissions.
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-3 py-2 text-sm text-gray-200 hover:bg-[#121F49]"
            >
              Закрыть
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:justify-between shrink-0">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск: permission / описание / роль / политика"
                className="w-full rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-4 py-2 text-sm text-white"
              />

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showDenied}
                  onChange={(e) => setShowDenied(e.target.checked)}
                  className="h-4 w-4 accent-[#0052FF]"
                />
                <span className="text-sm text-gray-200">
                  Показывать Denied
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={groupByRole}
                  onChange={(e) => setGroupByRole(e.target.checked)}
                  className="h-4 w-4 accent-[#0052FF]"
                />
                <span className="text-sm text-gray-200">
                  Группировать по ролям
                </span>
              </label>
            </div>

            <div className="text-sm text-gray-300 text-right">
              <div>
                Найдено:{" "}
                <span className="text-white font-semibold">
                  {filtered.length}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Granted: {stats.granted} · Denied: {stats.denied} · Roles:{" "}
                {stats.roles}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="px-6 pb-6 overflow-auto">
            <div className="overflow-hidden rounded-2xl border border-[#1E2A45]">
              <div className="max-h-[65vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#0E1A3A]">
                    <tr className="text-gray-200">
                      <th className="px-4 py-3">Permission</th>
                      <th className="px-4 py-3">Статус</th>
                      <th className="px-4 py-3">Источник</th>
                      <th className="px-4 py-3">Детали</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#1E2A45]">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-gray-300">
                          Загрузка прав пользователя…
                        </td>
                      </tr>
                    ) : groupByRole ? (
                      groupedByRole.map(([role, perms]) => (
                        <React.Fragment key={role}>
                          <tr className="bg-[#0E1A3A]">
                            <td colSpan={4} className="px-4 py-3 text-white">
                              {role}{" "}
                              <span className="text-xs text-gray-400">
                                ({perms.length})
                              </span>
                            </td>
                          </tr>

                          {perms.map((p) => (
                            <tr key={`${role}:${p.code}`}>
                              <td className="px-4 py-3 font-mono text-white">
                                {p.code}
                              </td>
                              <td className="px-4 py-3">
                                <StatusChip status="Granted" />
                              </td>
                              <td className="px-4 py-3 text-xs">
                                <SourceTooltip permission={p} />
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">
                                {explainGranted(p)}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-gray-400">
                          По заданному фильтру права не найдены.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((p) => (
                        <tr key={p.code}>
                          <td className="px-4 py-3 font-mono text-white">
                            {p.code}
                          </td>
                          <td className="px-4 py-3">
                            <StatusChip
                              status={p.granted ? "Granted" : "Denied"}
                            />
                          </td>
                          <td className="px-4 py-3 text-xs">
  <SourceTooltip
    permission={p}
    deniedReason={explainDenied(p, {
      userRoles: userRoleNames,
      showDenied,
      hasAllPermissions,
    })}
  />
</td>

                          <td className="px-4 py-3 text-xs text-gray-400">
                            {p.granted
                              ? explainGranted(p)
                              : explainDenied(p, {
                                  userRoles: userRoleNames,
                                  showDenied,
                                  hasAllPermissions,
                                })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-400">
              Примечание: Denied отображается только при наличии полного
              справочника permissions (allPermissions).
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
