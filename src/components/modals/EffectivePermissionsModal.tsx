// src/components/modals/EffectivePermissionsModal.tsx

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { buildEffectivePermissions, EffectivePermission } from "../../utils/effectivePermissions";

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

  // Optional: if you have global list of permissions - can show Denied too
  allPermissions?: PermissionLike[];

  // Safe UX: show loading while roles are lazy-loaded
  loading?: boolean;
};

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

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const roles = user?.roles || [];

  const effective: EffectivePermission[] = useMemo(() => {
    return buildEffectivePermissions({
      roles,
      allPermissions: showDenied ? allPermissions : undefined,
    });
  }, [roles, allPermissions, showDenied]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return effective;

    return effective.filter((p) => {
      const code = p.code.toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const rolesStr = p.roles.join(" ").toLowerCase();
      const policiesStr = p.policies.join(" ").toLowerCase();
      return (
        code.includes(q) ||
        desc.includes(q) ||
        rolesStr.includes(q) ||
        policiesStr.includes(q)
      );
    });
  }, [effective, query]);

  if (!isOpen || !mounted) return null;

  const titleUser = user?.email || user?.full_name || "Пользователь";

  const modal = (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onMouseDown={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-5xl rounded-2xl border border-[#1E2A45] bg-[#121A33] shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-[#1E2A45] px-6 py-5">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-white">Эффективные права</div>
              <div className="mt-1 text-sm text-gray-300 break-words">{titleUser}</div>
              <div className="mt-2 text-xs text-gray-400">
                Read-only. Права агрегируются из ролей → политик → permissions. Ничего не изменяется.
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
          <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск: permission / описание / роль / политика"
                className="w-full rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none"
              />

              <label className="flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={showDenied}
                  onChange={(e) => setShowDenied(e.target.checked)}
                  className="h-4 w-4 accent-[#0052FF]"
                />
                <span className="text-sm text-gray-200">Показывать Denied (если доступен allPermissions)</span>
              </label>
            </div>

            <div className="text-sm text-gray-300">
              Найдено: <span className="text-white font-semibold">{filtered.length}</span>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <div className="overflow-hidden rounded-2xl border border-[#1E2A45]">
              <div className="max-h-[65vh] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[#0E1A3A]">
                    <tr className="text-gray-200">
                      <th className="px-4 py-3 font-semibold">Permission</th>
                      <th className="px-4 py-3 font-semibold">Статус</th>
                      <th className="px-4 py-3 font-semibold">Источник</th>
                      <th className="px-4 py-3 font-semibold">Детали</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#1E2A45]">
                    {loading ? (
                      <tr>
                        <td className="px-4 py-6 text-sm text-gray-300" colSpan={4}>
                          Загрузка прав пользователя…
                        </td>
                      </tr>
                    ) : (
                      <>
                        {filtered.map((p) => (
                          <tr key={p.code} className="text-gray-100 hover:bg-[#0E1A3A]/40">
                            <td className="px-4 py-3 align-top">
                              <div className="font-mono text-[13px] text-white">{p.code}</div>
                              {p.description ? (
                                <div className="mt-1 text-xs text-gray-300">{p.description}</div>
                              ) : null}
                            </td>

                            <td className="px-4 py-3 align-top">
                              {p.granted ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                                  Granted
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-gray-500/15 px-3 py-1 text-xs font-semibold text-gray-300 border border-gray-500/30">
                                  Denied
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 align-top">
                              {p.roles.length > 0 ? (
                                <div className="space-y-1">
                                  {p.roles.map((r) => (
                                    <div
                                      key={r}
                                      className="inline-flex rounded-full border border-[#1E2A45] bg-[#0E1A3A] px-3 py-1 text-xs text-gray-200 mr-2 mb-1"
                                    >
                                      Role: {r}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3 align-top">
                              {p.policies.length > 0 ? (
                                <div className="space-y-1">
                                  {p.policies.map((pol) => (
                                    <div
                                      key={pol}
                                      className="inline-flex rounded-full border border-[#1E2A45] bg-[#0E1A3A] px-3 py-1 text-xs text-gray-200 mr-2 mb-1"
                                    >
                                      Policy: {pol}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Not assigned</span>
                              )}
                            </td>
                          </tr>
                        ))}

                        {filtered.length === 0 ? (
                          <tr>
                            <td className="px-4 py-6 text-sm text-gray-300" colSpan={4}>
                              Ничего не найдено по текущему фильтру.
                            </td>
                          </tr>
                        ) : null}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-400">
              Примечание: “Denied” отображается только если доступен полный справочник permissions (allPermissions).
              В v1 достаточно Granted — это уже даёт explainability.
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
