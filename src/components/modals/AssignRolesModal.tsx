import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";

interface Role {
  id: number;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  onAssigned: () => void;
}

export default function AssignRolesModal({ open, onClose, userId, onAssigned }: Props) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;

    fetch("http://127.0.0.1:8000/roles/")
      .then((res) => res.json())
      .then((data) => {
        // ВАЖНО: API теперь возвращает объект {items, total}
        setRoles(data.items || []);
      })
      .catch(() => {
        toast.error("Ошибка загрузки ролей");
        setRoles([]);
      });
  }, [open]);

  const handleSave = async () => {
    if (!userId) return;

    try {
      for (const roleId of selectedRoles) {
        await fetch(`http://127.0.0.1:8000/users/${userId}/assign_role/${roleId}`, {
          method: "POST"
        });
      }

      toast.success("Роли успешно назначены");
      onAssigned();
      onClose();
    } catch {
      toast.error("Ошибка назначения ролей");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#121A33] text-white rounded-2xl p-6 border border-[#1E2A45] shadow-2xl w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Назначить роли
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scroll">
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={selectedRoles.includes(role.id)}
                onCheckedChange={(checked) => {
                  setSelectedRoles((prev) =>
                    checked ? [...prev, role.id] : prev.filter((id) => id !== role.id)
                  );
                }}
              />
              <span className="text-gray-300">{role.name}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-500 text-gray-300 hover:bg-[#1A243F]"
          >
            Отмена
          </Button>

          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
