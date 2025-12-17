import { useEffect, useState } from "react";
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
  assignedPermissions: Permission[];
  onClose: () => void;
  onUpdated: () => void;
}

export default function AssignPermissionsModal({
  roleId,
  assignedPermissions,
  onClose,
  onUpdated,
}: Props) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const assignedIds = new Set(assignedPermissions.map((p) => p.id));

  useEffect(() => {
    fetchPermissions()
      .then(setPermissions)
      .finally(() => setLoading(false));
  }, []);

  async function togglePermission(p: Permission) {
    if (assignedIds.has(p.id)) {
      await removePermissionFromRole(roleId, p.id);
    } else {
      await addPermissionToRole(roleId, p.id);
    }
    onUpdated();
  }

  if (loading) {
    return <div className="p-6 text-gray-400">Загрузка…</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl w-[520px] max-h-[80vh] overflow-auto p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Назначение прав
        </h2>

        <div className="space-y-2">
          {permissions.map((p) => {
            const active = assignedIds.has(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-2 rounded-md hover:bg-[#0E1A3A]"
              >
                <span className="font-mono text-sm text-white">{p.code}</span>
                <button
                  onClick={() => togglePermission(p)}
                  className={`px-3 py-1 rounded text-sm ${
                    active
                      ? "bg-red-600/20 text-red-400"
                      : "bg-green-600/20 text-green-400"
                  }`}
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
