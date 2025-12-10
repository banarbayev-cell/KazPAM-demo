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

interface Policy {
  id: number;
  name: string;
  type: string;
  status: string;
}

export default function AssignPoliciesModal({
  open,
  onClose,
  roleId,
  onAssigned
}: {
  open: boolean;
  onClose: () => void;
  roleId: number | null;
  onAssigned: () => void;
}) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  // -----------------------------
  // Загрузить список политик
  // -----------------------------
  const loadPolicies = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/policies/");
      const data = await res.json();
      setPolicies(data);
    } catch (err) {
      toast.error("Ошибка загрузки политик");
    }
  };

  useEffect(() => {
    if (open) loadPolicies();
  }, [open]);

  const togglePolicy = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // -----------------------------
  // Отправка назначения
  // -----------------------------
  const assign = async () => {
    if (!roleId) return;

    try {
      for (const pid of selected) {
        await fetch(
          `http://127.0.0.1:8000/roles/${roleId}/add_policy/${pid}`,
          { method: "POST" }
        );
      }

      toast.success("Политики успешно привязаны!");
      onAssigned();
      onClose();
    } catch (err) {
      toast.error("Ошибка назначения политик");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Привязать политики</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
          {policies.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2 border rounded-md">
              <Checkbox
                checked={selected.includes(p.id)}
                onCheckedChange={() => togglePolicy(p.id)}
              />
              <span className="font-medium">{p.name}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={assign} className="bg-blue-600 hover:bg-blue-700">
            Привязать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
