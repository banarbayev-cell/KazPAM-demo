import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Target } from "@/types/targets";
import {
  bindTargetToUser,
  getTargetInventoryAccess,
  listUsersForTargetAccess,
  unbindTargetFromUser,
  type InventoryAccessUser,
  type InventoryAccessRole,
  type TargetInventoryAccessSummary,
} from "@/api/inventoryRbac";

interface Props {
  open: boolean;
  target: Target | null;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
}

function extractErrorMessage(error: any): string {
  return (
    error?.response?.data?.detail ||
    error?.message ||
    "Неизвестная ошибка"
  );
}

function roleChip(role: InventoryAccessRole, tone: "blue" | "gray" = "gray") {
  const cls =
    tone === "blue"
      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
      : "bg-gray-500/20 text-gray-300 border-gray-500/30";

  return (
    <span
      key={`${tone}-${role.id}`}
      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${cls}`}
    >
      {role.name}
    </span>
  );
}

export default function TargetUserAccessModal({
  open,
  target,
  onClose,
  onUpdated,
}: Props) {
  const [summary, setSummary] = useState<TargetInventoryAccessSummary | null>(null);
  const [users, setUsers] = useState<InventoryAccessUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyUserIds, setBusyUserIds] = useState<number[]>([]);

  const load = async () => {
    if (!target) return;

    setLoading(true);
    try {
      const [summaryPayload, usersPayload] = await Promise.all([
        getTargetInventoryAccess(target.id),
        listUsersForTargetAccess(),
      ]);

      setSummary(summaryPayload);
      setUsers(Array.isArray(usersPayload) ? usersPayload : []);
    } catch (e: any) {
      toast.error(extractErrorMessage(e) || "Не удалось загрузить доступ к target");
      setSummary(null);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !target) return;
    setSearch("");
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.id]);

  const directUserIds = useMemo(() => {
    return new Set((summary?.direct_users || []).map((u) => u.id));
  }, [summary]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    const prepared = (users || []).filter((u) => {
      if (!q) return true;

      return (
        String(u.id).includes(q) ||
        String(u.email || "").toLowerCase().includes(q) ||
        String(u.username || "").toLowerCase().includes(q) ||
        String(u.full_name || "").toLowerCase().includes(q)
      );
    });

    return prepared.sort((a, b) => {
      const aDirect = directUserIds.has(a.id) ? 1 : 0;
      const bDirect = directUserIds.has(b.id) ? 1 : 0;

      if (aDirect !== bDirect) return bDirect - aDirect;

      const aActive = a.is_active === false ? 0 : 1;
      const bActive = b.is_active === false ? 0 : 1;

      if (aActive !== bActive) return bActive - aActive;

      return String(a.email || a.username || a.id).localeCompare(
        String(b.email || b.username || b.id),
        "ru"
      );
    });
  }, [users, search, directUserIds]);

  const setBusy = (userId: number, value: boolean) => {
    setBusyUserIds((prev) =>
      value ? [...prev, userId] : prev.filter((id) => id !== userId)
    );
  };

  const handleGrant = async (user: InventoryAccessUser) => {
    if (!target) return;

    try {
      setBusy(user.id, true);
      await bindTargetToUser(user.id, target.id);
      toast.success(
        `Доступ к ${target.name} выдан пользователю ${
          user.email || user.username || `#${user.id}`
        }`
      );
      await load();
      await onUpdated();
    } catch (e: any) {
      toast.error(extractErrorMessage(e) || "Не удалось выдать доступ");
    } finally {
      setBusy(user.id, false);
    }
  };

  const handleRevoke = async (user: InventoryAccessUser) => {
    if (!target) return;

    try {
      setBusy(user.id, true);
      await unbindTargetFromUser(user.id, target.id);
      toast.success(
        `Доступ к ${target.name} снят у пользователя ${
          user.email || user.username || `#${user.id}`
        }`
      );
      await load();
      await onUpdated();
    } catch (e: any) {
      toast.error(extractErrorMessage(e) || "Не удалось снять доступ");
    } finally {
      setBusy(user.id, false);
    }
  };

  if (!open || !target) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121A33] rounded-xl border border-[#1E2A45] w-[1100px] max-w-[96vw] max-h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-[#1E2A45] shrink-0 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Доступ пользователей к target #{target.id}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {target.name} · {target.host}:{target.port} · {String(target.protocol || "").toUpperCase()}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm"
          >
            Закрыть
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100 leading-6">
            Здесь настраивается <b>прямой доступ пользователя</b> к целевой системе без создания
            дублирующих ролей. Role-based доступ продолжает работать отдельно и не ломается.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] p-4">
              <div className="text-xs text-gray-400">Direct users</div>
              <div className="mt-1 text-2xl font-bold text-white">
                {summary?.direct_users?.length ?? 0}
              </div>
            </div>

            <div className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] p-4">
              <div className="text-xs text-gray-400">Direct roles</div>
              <div className="mt-1 text-2xl font-bold text-white">
                {summary?.direct_roles?.length ?? 0}
              </div>
            </div>

            <div className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] p-4">
              <div className="text-xs text-gray-400">Inherited roles</div>
              <div className="mt-1 text-2xl font-bold text-white">
                {summary?.inherited_roles?.length ?? 0}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] p-4">
              <div className="text-sm font-semibold text-white mb-3">Role-based access</div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-400 mb-2">Direct roles</div>
                  <div className="flex flex-wrap gap-2">
                    {summary?.direct_roles?.length
                      ? summary.direct_roles.map((r) => roleChip(r, "blue"))
                      : <span className="text-gray-500">Не назначены</span>}
                  </div>
                </div>

                <div>
                  <div className="text-gray-400 mb-2">Inherited roles</div>
                  <div className="flex flex-wrap gap-2">
                    {summary?.inherited_roles?.length
                      ? summary.inherited_roles.map((r) => roleChip(r, "gray"))
                      : <span className="text-gray-500">Нет наследования</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] p-4">
              <div className="text-sm font-semibold text-white mb-3">Direct user access</div>

              {summary?.direct_users?.length ? (
                <div className="space-y-2">
                  {summary.direct_users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#1E2A45] bg-[#121A33] px-3 py-2"
                    >
                      <div>
                        <div className="text-sm text-white">
                          {u.email || u.username || `User #${u.id}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {u.full_name || "—"} · {u.is_active === false ? "inactive" : "active"}
                        </div>
                      </div>

                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium border bg-green-500/20 text-green-300 border-green-500/30">
                        Direct
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Пока нет пользователей с прямым доступом к этому target.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по email / username / ФИО / user id..."
              className="w-96 bg-white text-black border p-2 rounded"
            />

            <div className="text-sm text-gray-400">
              Пользователи: <span className="text-white">{filteredUsers.length}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33]">
            <table className="w-full text-sm text-white">
              <thead className="bg-[#1A243F] text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">ФИО</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Access</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-300">
                      Загрузка...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-300">
                      Пользователи не найдены
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isDirect = directUserIds.has(user.id);
                    const isBusy = busyUserIds.includes(user.id);

                    return (
                      <tr
                        key={user.id}
                        className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] transition"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {user.email || user.username || `User #${user.id}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {user.id} {user.username ? `· ${user.username}` : ""}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-gray-200">
                          {user.full_name || "—"}
                        </td>

                        <td className="px-4 py-3">
                          {user.is_active === false ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium border bg-red-500/20 text-red-300 border-red-500/30">
                              Inactive
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium border bg-green-500/20 text-green-300 border-green-500/30">
                              Active
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {isDirect ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium border bg-green-500/20 text-green-300 border-green-500/30">
                              Direct user access
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium border bg-gray-500/20 text-gray-300 border-gray-500/30">
                              Нет прямого доступа
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {isDirect ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRevoke(user)}
                              className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs"
                            >
                              {isBusy ? "Снятие..." : "Снять доступ"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleGrant(user)}
                              className="px-3 py-1 rounded bg-[#0052FF] hover:bg-[#0046D8] disabled:bg-gray-600 text-white text-xs"
                            >
                              {isBusy ? "Назначение..." : "Выдать доступ"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}