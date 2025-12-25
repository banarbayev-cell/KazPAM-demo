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

interface RolesResponse {
  items: Role[];
  total: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  onAssigned: () => void;
}

/* =======================
   Component
======================= */
export default function AssignRolesModal({
  open,
  onClose,
  userId,
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
        const data: RolesResponse = await api.get("/roles");
        setRoles(data.items);
      } catch {
        toast.error("Ошибка загрузки ролей");
        setRoles([]);
      }
    };

    loadRoles();
  }, [open]);

  /* =======================
     Save roles
  ======================= */
  const handleSave = async () => {
    if (!userId) return;

    try {
      for (const roleId of selectedRoles) {
        await api.post(`/users/${userId}/assign_role/${roleId}`);
      }

      toast.success("Роли успешно назначены");
      onAssigned();
      onClose();
    } catch {
      toast.error("Ошибка назначения ролей");
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
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Checkbox
                checked={selectedRoles.includes(role.id)}
                onCheckedChange={(checked) => {
                  setSelectedRoles((prev) =>
                    checked
                      ? [...prev, role.id]
                      : prev.filter((id) => id !== role.id)
                  );
                }}
              />
              <span className="text-gray-300">{role.name}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
