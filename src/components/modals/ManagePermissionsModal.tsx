import { useEffect, useState } from "react";
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
interface Permission {
  id: number;
  code: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  roleId: number | null;
  existingPermissions: Permission[];
  onUpdated: () => void;
}

/* =======================
   Component
======================= */
export default function ManagePermissionsModal({
  open,
  onClose,
  roleId,
  existingPermissions,
  onUpdated,
}: Props) {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  /* =======================
     Load permissions
  ======================= */
  useEffect(() => {
    if (!open) return;

    const loadPermissions = async () => {
      try {
        const data: Permission[] = await api.get("/permissions/");
        setAllPermissions(data);
        setSelected(existingPermissions.map((p) => p.id));
      } catch {
        toast.error("Ошибка загрузки прав");
        setAllPermissions([]);
      }
    };

    loadPermissions();
  }, [open, existingPermissions]);

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /* =======================
     Save permissions
  ======================= */
  const save = async () => {
    if (!roleId) return;

    const currentIds = existingPermissions.map((p) => p.id);

    const toAdd = selected.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !selected.includes(id));

    try {
      for (const permId of toAdd) {
        await api.post(`/permissions/${roleId}/add/${permId}`);
      }

      for (const permId of toRemove) {
        await api.post(`/permissions/${roleId}/remove/${permId}`);
      }

      toast.success("Права обновлены");
      onUpdated();
      onClose();
    } catch {
      toast.error("Ошибка обновления прав");
    }
  };

  /* =======================
     Render
  ======================= */
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0A0F24] text-white border border-[#1E2A45]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Управление правами роли
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {allPermissions.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-[#121A33] cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(p.id)}
                onCheckedChange={() => toggle(p.id)}
              />
              <span>{p.code}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end mt-4 gap-3">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save}>Сохранить</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
