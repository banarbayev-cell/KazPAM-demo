import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import { api } from "../../services/api";

/* =======================
   Types
======================= */
interface Role {
  id: number;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  userRoles?: Role[]; // ⬅️ роли пользователя (truth source)
  onAssigned: () => void;
}

/* =======================
   Component
======================= */
export default function AssignRolesModal({
  open,
  onClose,
  userId,
  userRoles = [],
  onAssigned,
}: Props) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

  /* =======================
     Load roles
  ======================= */
  useEffect(() => {
    if (!open) return;

    const loadRoles = async () => {
      try {
        const data = await api.get("/roles");

        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        setRoles(items);
      } catch {
        toast.error("Ошибка загрузки ролей");
        setRoles([]);
      }
    };

    loadRoles();
  }, [open]);

  /* =======================
     Init selected roles
  ======================= */
  useEffect(() => {
    if (!open) return;

    setSelectedRoles(userRoles.map((r) => r.id));
  }, [open, userRoles]);

  /* =======================
     Toggle role
  ======================= */
  const toggleRole = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  /* =======================
     Save roles (diff-based)
  ======================= */
  const handleSave = async () => {
    if (!userId) return;

    try {
      const currentRoleIds = userRoles.map((r) => r.id);

      const rolesToAdd = selectedRoles.filter(
        (id) => !currentRoleIds.includes(id)
      );

      const rolesToRemove = currentRoleIds.filter(
        (id) => !selectedRoles.includes(id)
      );

      for (const roleId of rolesToAdd) {
        await api.post(`/roles/assign_role/${userId}/${roleId}`);
      }

      for (const roleId of rolesToRemove) {
        await api.delete(`/roles/remove_role/${userId}/${roleId}`);
      }

      toast.success("Роли успешно обновлены");
      onAssigned();
      onClose();
    } catch {
      toast.error("Ошибка обновления ролей");
    }
  };

  /* =======================
     Render
  ======================= */
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#121A33] text-white rounded-2xl p-6 border border-[#1E2A45] shadow-2xl w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Назначить роли
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
          {roles.length > 0 ? (
            roles.map((role) => (
              <label
                key={role.id}
                className="flex items-center gap-3 cursor-pointer select-none"
              >
                <Checkbox
                  checked={selectedRoles.includes(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                />
                <span className="text-gray-300">{role.name}</span>
              </label>
            ))
          ) : (
            <div className="text-gray-400 text-sm">Роли не найдены</div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            onClick={onClose}
            className="bg-[#1A243F] text-white border border-[#1E2A45] hover:bg-[#232F55]"
          >
            Отмена
          </Button>

          <Button
            onClick={handleSave}
            className="bg-[#0052FF] text-white hover:bg-[#0046DB]"
          >
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
