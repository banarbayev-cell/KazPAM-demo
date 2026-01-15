// src/components/modals/AssignPoliciesModal.tsx
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

interface Policy {
  id: number;
  name: string;
  type: string;
  status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  roleId: number | null;
  roleName: string;
  assignedPolicies: Policy[]; // ✅ ВАЖНО
  onAssigned: () => void;
}

export default function AssignPoliciesModal({
  open,
  onClose,
  roleId,
  roleName,
  assignedPolicies,
  onAssigned,
}: Props) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // 🔒 уже привязанные политики
  const assignedIds = new Set(assignedPolicies.map((p) => p.id));

  // -----------------------------
  // Загрузить список политик
  // -----------------------------
  const loadPolicies = async () => {
    try {
      const data = await api.get<Policy[]>("/policies/");
      setPolicies(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Ошибка загрузки политик");
      setPolicies([]);
    }
  };

  useEffect(() => {
    if (open) {
      loadPolicies();
    }
  }, [open]);

  // -----------------------------
  // Toggle policy
  // -----------------------------
  const togglePolicy = async (policy: Policy) => {
    if (!roleId) return;

    try {
      setProcessingId(policy.id);

      if (assignedIds.has(policy.id)) {
        await api.delete(
          `/roles/${roleId}/remove_policy/${policy.id}`
        );
        toast.success(
          `Политика отвязана: ${policy.name} → роль «${roleName}»`
        );
      } else {
        await api.post(
          `/roles/${roleId}/add_policy/${policy.id}`
        );
        toast.success(
          `Политика привязана: ${policy.name} → роль «${roleName}»`
        );
      }

      onAssigned();
    } catch {
      toast.error(
        `Ошибка изменения политики: ${policy.name} → роль «${roleName}»`
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Назначение политик для роли «{roleName}»
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {policies.length === 0 ? (
            <p className="text-sm text-gray-400">
              Политики не найдены
            </p>
          ) : (
            policies.map((p) => {
              const active = assignedIds.has(p.id);
              const isProcessing = processingId === p.id;

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={active} disabled />
                    <span className="font-medium">
                      {p.name}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => togglePolicy(p)}
                    className={
                      active
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                    }
                  >
                    {active ? "Отвязать" : "Привязать"}
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
