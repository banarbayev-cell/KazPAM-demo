import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { listRoles, type RoleLite } from "@/api/roles";
import {
  bindTargetToRole,
  getRoleInventoryAccess,
  unbindTargetFromRole,
  type RoleInventoryAccessOut,
} from "@/api/inventoryRbac";
import type { Target } from "@/types/targets";

interface Props {
  open: boolean;
  target: Target | null;
  onClose: () => void;
  onUpdated?: () => void;
}

type RoleAccessRow = {
  role: RoleLite;
  access: RoleInventoryAccessOut | null;
};

function extractErrorMessage(error: any): string {
  return (
    error?.message ||
    error?.detail ||
    error?.response?.data?.detail ||
    "Неизвестная ошибка"
  );
}

function hasTarget(list: Array<{ id: number }> | undefined, targetId: number) {
  return Array.isArray(list) && list.some((item) => item.id === targetId);
}

export default function TargetRoleAccessModal({
  open,
  target,
  onClose,
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [rows, setRows] = useState<RoleAccessRow[]>([]);
  const [search, setSearch] = useState("");

  const targetId = target?.id ?? null;

  async function loadAccess() {
    if (!targetId) return;

    setLoading(true);

    try {
      const roles = await listRoles();
      const safeRoles = Array.isArray(roles) ? roles : [];

      const roleRows = await Promise.all(
        safeRoles.map(async (role) => {
          try {
            const access = await getRoleInventoryAccess(role.id);
            return { role, access };
          } catch {
            return { role, access: null };
          }
        })
      );

      setRows(roleRows);
    } catch (error: any) {
      toast.error(
        extractErrorMessage(error) || "Ошибка загрузки доступа к target"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !targetId) return;
    loadAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targetId]);

  const directRows = useMemo(() => {
    if (!targetId) return [];

    return rows.filter((row) =>
      hasTarget(row.access?.direct_targets, targetId)
    );
  }, [rows, targetId]);

  const inheritedRows = useMemo(() => {
    if (!targetId) return [];

    return rows.filter((row) => {
      const direct = hasTarget(row.access?.direct_targets, targetId);
      const effective = hasTarget(row.access?.effective_targets, targetId);
      return effective && !direct;
    });
  }, [rows, targetId]);

  const availableRows = useMemo(() => {
    if (!targetId) return [];

    const q = search.trim().toLowerCase();

    return rows
      .filter((row) => {
        const direct = hasTarget(row.access?.direct_targets, targetId);
        const effective = hasTarget(row.access?.effective_targets, targetId);

        return !direct && !effective;
      })
      .filter((row) => {
        if (!q) return true;

        return (
          String(row.role.id).includes(q) ||
          row.role.name.toLowerCase().includes(q)
        );
      });
  }, [rows, targetId, search]);

  async function handleBind(roleId: number) {
    if (!targetId) return;

    const key = `bind-${roleId}`;
    setSavingKey(key);

    try {
      await bindTargetToRole(roleId, targetId);
      toast.success("Роль получила доступ к target");
      await loadAccess();
      onUpdated?.();
    } catch (error: any) {
      toast.error(extractErrorMessage(error) || "Ошибка назначения доступа");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleUnbind(roleId: number) {
    if (!targetId) return;

    const key = `unbind-${roleId}`;
    setSavingKey(key);

    try {
      await unbindTargetFromRole(roleId, targetId);
      toast.success("Доступ роли к target удалён");
      await loadAccess();
      onUpdated?.();
    } catch (error: any) {
      toast.error(extractErrorMessage(error) || "Ошибка удаления доступа");
    } finally {
      setSavingKey(null);
    }
  }

  if (!open || !target) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-[#0A0F24] w-[960px] max-w-[96vw] max-h-[90vh] overflow-y-auto p-6 rounded-xl border border-white/10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Доступ к целевой системе
            </h2>

            <p className="text-sm text-gray-400 mt-1">
              Target:{" "}
              <span className="text-gray-200">
                #{target.id} · {target.name} · {target.host}:{target.port}
              </span>
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Здесь настраивается, какие роли могут запускать сессии на эту
              целевую систему.
            </p>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1E2A45] text-white hover:bg-[#2A3A5F]"
          >
            Закрыть
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-4">
            <div className="text-sm text-gray-400">Прямой доступ</div>
            <div className="text-2xl font-bold text-white mt-2">
              {directRows.length}
            </div>
          </div>

          <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-4">
            <div className="text-sm text-gray-400">Через группы</div>
            <div className="text-2xl font-bold text-white mt-2">
              {inheritedRows.length}
            </div>
          </div>

          <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-4">
            <div className="text-sm text-gray-400">Можно назначить</div>
            <div className="text-2xl font-bold text-white mt-2">
              {availableRows.length}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-300">Загрузка доступа...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">
                  Назначенные роли
                </h3>

                <div className="space-y-2">
                  {directRows.length === 0 ? (
                    <div className="text-sm text-gray-400">
                      Прямых назначений нет
                    </div>
                  ) : (
                    directRows.map((row) => (
                      <div
                        key={row.role.id}
                        className="flex items-center justify-between gap-3 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-4 py-3"
                      >
                        <div>
                          <div className="text-white text-sm font-medium">
                            {row.role.name}
                          </div>
                          <div className="text-gray-400 text-xs">
                            Role #{row.role.id} · direct access
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnbind(row.role.id)}
                          disabled={savingKey === `unbind-${row.role.id}`}
                          className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs disabled:opacity-50"
                        >
                          Убрать
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-white font-semibold">Добавить роль</h3>

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск роли..."
                    className="w-64 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto">
                  {availableRows.length === 0 ? (
                    <div className="text-sm text-gray-400">
                      Свободных ролей не найдено
                    </div>
                  ) : (
                    availableRows.map((row) => (
                      <div
                        key={row.role.id}
                        className="flex items-center justify-between gap-3 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-4 py-3"
                      >
                        <div>
                          <div className="text-white text-sm font-medium">
                            {row.role.name}
                          </div>
                          <div className="text-gray-400 text-xs">
                            Role #{row.role.id}
                          </div>
                        </div>

                        <button
                          onClick={() => handleBind(row.role.id)}
                          disabled={savingKey === `bind-${row.role.id}`}
                          className="px-3 py-1 rounded bg-[#0052FF] hover:bg-[#0046D8] text-white text-xs disabled:opacity-50"
                        >
                          Добавить
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">
                Доступ через Target Groups
              </h3>

              {inheritedRows.length === 0 ? (
                <div className="text-sm text-gray-400">
                  Нет ролей, которые получают доступ к этому target через группы.
                </div>
              ) : (
                <div className="space-y-2">
                  {inheritedRows.map((row) => (
                    <div
                      key={row.role.id}
                      className="bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-4 py-3"
                    >
                      <div className="text-white text-sm font-medium">
                        {row.role.name}
                      </div>

                      <div className="text-gray-400 text-xs mt-1">
                        Role #{row.role.id} · доступ выдан через Target Group.
                        Удалять такой доступ нужно через управление группами.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] p-4 text-sm text-gray-300">
              Сессии на этот target смогут запускать только пользователи, у
              которых есть одна из назначенных ролей. Это не меняет политики,
              Vault, MFA, Break-glass и текущую backend-логику.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}