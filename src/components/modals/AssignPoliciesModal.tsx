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
import { api } from "@/services/api"; // ✅ ВАЖНО

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
      const data = await api.get<Policy[]>("/policies/");
      setPolicies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Ошибка загрузки политик");
      setPolicies([]); // защита
    }
  };

  useEffect(() => {
    if (open) {
      loadPolicies();
      setSelected([]);
    }
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
        await api.post(`/roles/${roleId}/add_policy/${pid}`);
      }

      toast.success("Политики успешно привязаны!");
      onAssigned();
      onClose();
    } catch (err) {
      console.error(err);
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
          {policies.length === 0 ? (
            <p className="text-sm text-gray-400">Политики не найдены</p>
          ) : (
            policies.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2 border rounded-md"
              >
                <Checkbox
                  checked={selected.includes(p.id)}
                  onCheckedChange={() => togglePolicy(p.id)}
                />
                <span className="font-medium">{p.name}</span>
              </div>
            ))
          )}
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
