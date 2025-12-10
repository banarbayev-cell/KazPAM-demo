import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";

import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";

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

export default function ManagePermissionsModal({
  open,
  onClose,
  roleId,
  existingPermissions,
  onUpdated
}: Props) {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  // загрузка всех permissions
  useEffect(() => {
    if (!open) return;

    fetch("http://127.0.0.1:8000/permissions/")
      .then((res) => res.json())
      .then((data) => setAllPermissions(data));

    // отметить уже существующие
    setSelected(existingPermissions.map((p) => p.id));
  }, [open]);

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const save = async () => {
    if (!roleId) return;

    const currentIds = existingPermissions.map((p) => p.id);

    const toAdd = selected.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !selected.includes(id));

    // добавляем
    for (const permId of toAdd) {
      await fetch(`http://127.0.0.1:8000/permissions/${roleId}/add/${permId}`, {
        method: "POST"
      });
    }

    // удаляем
    for (const permId of toRemove) {
      await fetch(
        `http://127.0.0.1:8000/permissions/${roleId}/remove/${permId}`,
        { method: "DELETE" }
      );
    }

    toast.success("Права обновлены");
    onUpdated();
    onClose();
  };

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
