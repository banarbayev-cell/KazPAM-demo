import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { listTargets } from "@/api/targets";
import { listTargetGroups } from "@/api/targetGroups";
import {
  bindTargetGroupToRole,
  bindTargetToRole,
  getRoleInventoryAccess,
  unbindTargetGroupFromRole,
  unbindTargetFromRole,
  type RoleInventoryAccessOut,
} from "@/api/inventoryRbac";

import type { Target } from "@/types/targets";
import type { TargetGroup } from "@/types/targetGroups";

interface Props {
  open: boolean;
  onClose: () => void;
  roleId: number | null;
  roleName: string;
  onUpdated: () => void;
}

function extractErrorMessage(error: any): string {
  return (
    error?.message ||
    error?.detail ||
    error?.response?.data?.detail ||
    "Неизвестная ошибка"
  );
}

export default function AssignInventoryAccessModal({
  open,
  onClose,
  roleId,
  roleName,
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [targets, setTargets] = useState<Target[]>([]);
  const [groups, setGroups] = useState<TargetGroup[]>([]);
  const [access, setAccess] = useState<RoleInventoryAccessOut | null>(null);

  const [targetSearch, setTargetSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  async function loadAll() {
    if (!roleId) return;

    setLoading(true);
    try {
      const [targetsRes, groupsRes, accessRes] = await Promise.all([
        listTargets(),
        listTargetGroups(),
        getRoleInventoryAccess(roleId),
      ]);

      setTargets(Array.isArray(targetsRes) ? targetsRes : []);
      setGroups(Array.isArray(groupsRes) ? groupsRes : []);
      setAccess(accessRes ?? null);
    } catch (e: any) {
      toast.error(extractErrorMessage(e) || "Ошибка загрузки inventory access");
      setTargets([]);
      setGroups([]);
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !roleId) return;
    loadAll();
  }, [open, roleId]);

  const directTargetIds = useMemo(
    () => new Set((access?.direct_targets ?? []).map((t) => t.id)),
    [access]
  );

  const boundGroupIds = useMemo(
    () => new Set((access?.target_groups ?? []).map((g) => g.id)),
    [access]
  );

  const availableTargets = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();

    return targets
      .filter((t) => !directTargetIds.has(t.id))
      .filter((t) => {
        if (!q) return true;
        return (
          String(t.id).includes(q) ||
          (t.name || "").toLowerCase().includes(q) ||
          (t.host || "").toLowerCase().includes(q) ||
          (t.protocol || "").toLowerCase().includes(q)
        );
      });
  }, [targets, directTargetIds, targetSearch]);

  const availableGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();

    return groups
      .filter((g) => !boundGroupIds.has(g.id))
      .filter((g) => {
        if (!q) return true;
        return (
          String(g.id).includes(q) ||
          (g.name || "").toLowerCase().includes(q) ||
          (g.description || "").toLowerCase().includes(q)
        );
      });
  }, [groups, boundGroupIds, groupSearch]);

  async function handleBindTarget(targetId: number) {
    if (!roleId) return;

    const key = `bind-target-${targetId}`;
    setSavingKey(key);
    try {
      const res = await bindTargetToRole(roleId, targetId);
      setAccess(res);
      toast.success("Target привязан к роли");
      onUpdated();
    } catch (e: any) {
      toast.error(extractErrorMessage(e) || "Ошибка привязки target");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleUnbindTarget(targetId: number) {
    if (!roleId) return;

    const key = `unbind-target-${targetId}`;
    setSavingKey(key);
    try {
      const res = await unbindTargetFromRole(roleId, targetId);
      setAccess(res);
      toast.success("Target отвязан от роли");
      onUpdated();
    } catch (e: any) {
      toast.error(extractErrorMessage(e) || "Ошибка отвязки target");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleBindGroup(groupId: number) {
    if (!roleId) return;

    const key = `bind-group-${groupId}`;
    setSavingKey(key);
    try {
      const res = await bindTargetGroupToRole(roleId, groupId);
      setAccess(res);
      toast.success("Target Group привязана к роли");
      onUpdated();
    } catch (e: any) {
      toast.error(extractErrorMessage(e) || "Ошибка привязки группы");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleUnbindGroup(groupId: number) {
    if (!roleId) return;

    const key = `unbind-group-${groupId}`;
    setSavingKey(key);
    try {
      const res = await unbindTargetGroupFromRole(roleId, groupId);
      setAccess(res);
      toast.success("Target Group отвязана от роли");
      onUpdated();
    } catch (e: any) {
      toast.error(extractErrorMessage(e) || "Ошибка отвязки группы");
    } finally {
      setSavingKey(null);
    }
  }

  if (!open || !roleId) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-[#0A0F24] w-[1100px] max-w-[96vw] max-h-[90vh] overflow-y-auto p-6 rounded-xl border border-white/10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Доступ к целевым системам
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Роль: <span className="text-gray-200">{roleName}</span>
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
            <div className="text-sm text-gray-400">Direct Targets</div>
            <div className="text-2xl font-bold text-white mt-2">
              {access?.direct_targets?.length ?? 0}
            </div>
          </div>

          <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-4">
            <div className="text-sm text-gray-400">Target Groups</div>
            <div className="text-2xl font-bold text-white mt-2">
              {access?.target_groups?.length ?? 0}
            </div>
          </div>

          <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-4">
            <div className="text-sm text-gray-400">Effective Targets</div>
            <div className="text-2xl font-bold text-white mt-2">
              {access?.effective_targets?.length ?? 0}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-300">Загрузка...</div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">Назначенные Targets</h3>

                <div className="space-y-2">
                  {(access?.direct_targets ?? []).length === 0 ? (
                    <div className="text-sm text-gray-400">Нет прямых привязок</div>
                  ) : (
                    access!.direct_targets.map((target) => (
                      <div
                        key={target.id}
                        className="flex items-center justify-between gap-3 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-4 py-3"
                      >
                        <div>
                          <div className="text-white text-sm font-medium">
                            {target.name}
                          </div>
                          <div className="text-gray-400 text-xs">
                            #{target.id} · {target.protocol.toUpperCase()} · {target.host}:{target.port}
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnbindTarget(target.id)}
                          disabled={savingKey === `unbind-target-${target.id}`}
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
                  <h3 className="text-white font-semibold">Добавить Target</h3>
                  <input
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                    placeholder="Поиск target..."
                    className="w-64 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {availableTargets.length === 0 ? (
                    <div className="text-sm text-gray-400">Свободных target не найдено</div>
                  ) : (
                    availableTargets.map((target) => (
                      <div
                        key={target.id}
                        className="flex items-center justify-between gap-3 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-4 py-3"
                      >
                        <div>
                          <div className="text-white text-sm font-medium">
                            {target.name}
                          </div>
                          <div className="text-gray-400 text-xs">
                            #{target.id} · {target.protocol.toUpperCase()} · {target.host}:{target.port}
                          </div>
                        </div>

                        <button
                          onClick={() => handleBindTarget(target.id)}
                          disabled={savingKey === `bind-target-${target.id}`}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">Назначенные Target Groups</h3>

                <div className="space-y-2">
                  {(access?.target_groups ?? []).length === 0 ? (
                    <div className="text-sm text-gray-400">Нет привязанных групп</div>
                  ) : (
                    access!.target_groups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between gap-3 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-4 py-3"
                      >
                        <div>
                          <div className="text-white text-sm font-medium">
                            {group.name}
                          </div>
                          <div className="text-gray-400 text-xs">
                            #{group.id} · {group.description || "Без описания"}
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnbindGroup(group.id)}
                          disabled={savingKey === `unbind-group-${group.id}`}
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
                  <h3 className="text-white font-semibold">Добавить Target Group</h3>
                  <input
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Поиск группы..."
                    className="w-64 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {availableGroups.length === 0 ? (
                    <div className="text-sm text-gray-400">Свободных групп не найдено</div>
                  ) : (
                    availableGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between gap-3 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-4 py-3"
                      >
                        <div>
                          <div className="text-white text-sm font-medium">
                            {group.name}
                          </div>
                          <div className="text-gray-400 text-xs">
                            #{group.id} · {group.description || "Без описания"}
                          </div>
                        </div>

                        <button
                          onClick={() => handleBindGroup(group.id)}
                          disabled={savingKey === `bind-group-${group.id}`}
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
              <h3 className="text-white font-semibold mb-4">Effective Targets</h3>

              <div className="flex flex-wrap gap-2">
                {(access?.effective_targets ?? []).length === 0 ? (
                  <div className="text-sm text-gray-400">Нет эффективных target</div>
                ) : (
                  access!.effective_targets.map((target) => (
                    <span
                      key={target.id}
                      className="px-3 py-1 rounded-full bg-[#0E1A3A] border border-[#1E2A45] text-xs text-gray-200"
                    >
                      #{target.id} · {target.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}