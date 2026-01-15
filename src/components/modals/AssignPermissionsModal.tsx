import { useEffect, useMemo, useState } from "react";
import { PERMISSION_DESCRIPTIONS } from "../../constants/permissions";
import { toast } from "sonner";
import {
  fetchPermissions,
  addPermissionToRole,
  removePermissionFromRole,
} from "../../api/permissions";

interface Permission {
  id: number;
  code: string;
}

interface Props {
  roleId: number;
  roleName: string;
  assignedPermissions: Permission[];
  onClose: () => void;
  onUpdated: () => void;
}

export default function AssignPermissionsModal({
  roleId,
  roleName,
  assignedPermissions,
  onClose,
  onUpdated,
}: Props) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const assignedIds = new Set(assignedPermissions.map((p) => p.id));

  useEffect(() => {
    fetchPermissions()
      .then(setPermissions)
      .catch(() => {
        toast.error("Не удалось загрузить список прав");
      })
      .finally(() => setLoading(false));
  }, []);

  function getPermissionLabel(code: string) {
    return PERMISSION_DESCRIPTIONS[code] || code;
  }

  // 🔍 ФИЛЬТРАЦИЯ ПРАВ (код + описание)
  const filteredPermissions = useMemo(() => {
    if (!search.trim()) return permissions;

    const q = search.toLowerCase();

    return permissions.filter((p) => {
      const code = p.code.toLowerCase();
      const label = getPermissionLabel(p.code).toLowerCase();
      return code.includes(q) || label.includes(q);
    });
  }, [permissions, search]);

  async function togglePermission(p: Permission) {
    const label = getPermissionLabel(p.code);

    try {
      setProcessingId(p.id);

      if (assignedIds.has(p.id)) {
        await removePermissionFromRole(roleId, p.id);
        toast.success(
          `Право удалено: ${label} → роль «${roleName}»`
        );
      } else {
        await addPermissionToRole(roleId, p.id);
        toast.success(
          `Право добавлено: ${label} → роль «${roleName}»`
        );
      }

      onUpdated();
    } catch {
      toast.error(
        `Ошибка при изменении права: ${label} → роль «${roleName}»`
      );
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="p-6 text-gray-400 bg-[#121A33] rounded-xl">
          Загрузка…
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl w-[560px] max-h-[80vh] overflow-auto p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Назначение прав для роли «{roleName}»
        </h2>

        {/* 🔍 Поиск */}
        <input
          type="text"
          placeholder="Поиск прав..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-[#0E1A3A] text-sm text-white border border-[#1E2A45] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />

        <div className="space-y-2">
          {filteredPermissions.length === 0 && (
            <div className="text-sm text-gray-400 px-2">
              Ничего не найдено
            </div>
          )}

          {filteredPermissions.map((p) => {
            const active = assignedIds.has(p.id);
            const isProcessing = processingId === p.id;

            return (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-2 rounded-md hover:bg-[#0E1A3A]"
              >
                {/* Код + описание */}
                <div className="flex flex-col">
                  <span className="font-mono text-sm text-white">
                    {p.code}
                  </span>
                  <span className="text-xs text-gray-400">
                    {getPermissionLabel(p.code)}
                  </span>
                </div>

                <button
                  disabled={isProcessing}
                  onClick={() => togglePermission(p)}
                  className={`px-3 py-1 rounded text-sm transition ${
                    active
                      ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                      : "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                  } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {active ? "Убрать" : "Добавить"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#1E2A45] text-gray-200 hover:bg-[#2A3560]"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
