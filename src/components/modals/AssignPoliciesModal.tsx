import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import { api } from "../../services/api";

/* =========================================================
   🔒 Module-level optimistic cache (SURVIVES REMOUNT)
========================================================= */
const optimisticPolicyCache: Record<number, number[]> = {};

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
  assignedPolicies: Policy[];
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

  /* -------------------------------------------------------
     Init optimistic cache ON OPEN
  ------------------------------------------------------- */
  useEffect(() => {
    if (!open || !roleId) return;

    if (!optimisticPolicyCache[roleId]) {
      optimisticPolicyCache[roleId] = assignedPolicies.map((p) => p.id);
    }
  }, [open, roleId, assignedPolicies]);

  /* -------------------------------------------------------
     Derived assigned set (FROM CACHE)
  ------------------------------------------------------- */
  const assignedSet = useMemo(() => {
    if (!roleId) return new Set<number>();
    return new Set(optimisticPolicyCache[roleId] || []);
  }, [roleId, optimisticPolicyCache[roleId]]);

  /* -------------------------------------------------------
     Load policies
  ------------------------------------------------------- */
  useEffect(() => {
    if (!open) return;

    api
      .get<Policy[]>("/policies/")
      .then((data) => setPolicies(Array.isArray(data) ? data : []))
      .catch(() => {
        toast.error("Ошибка загрузки политик");
        setPolicies([]);
      });
  }, [open]);

  /* -------------------------------------------------------
     Toggle policy (ABSOLUTE STABLE)
  ------------------------------------------------------- */
  const togglePolicy = async (policy: Policy) => {
    if (!roleId || processingId === policy.id) return;

    try {
      setProcessingId(policy.id);

      const cache = optimisticPolicyCache[roleId] || [];

      if (assignedSet.has(policy.id)) {
        await api.delete(`/roles/${roleId}/remove_policy/${policy.id}`);

        optimisticPolicyCache[roleId] = cache.filter(
          (id) => id !== policy.id
        );

        toast.success(
          `Политика отвязана: ${policy.name} → роль «${roleName}»`
        );
      } else {
        await api.post(`/roles/${roleId}/add_policy/${policy.id}`);

        optimisticPolicyCache[roleId] = cache.includes(policy.id)
          ? cache
          : [...cache, policy.id];

        toast.success(
          `Политика привязана: ${policy.name} → роль «${roleName}»`
        );
      }
    } catch {
      toast.error(
        `Ошибка изменения политики: ${policy.name} → роль «${roleName}»`
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* -------------------------------------------------------
     Cleanup + refresh parent ON CLOSE
  ------------------------------------------------------- */
  useEffect(() => {
    if (!open && roleId) {
      delete optimisticPolicyCache[roleId];
      onAssigned();
    }
  }, [open, roleId, onAssigned]);

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
            <p className="text-sm text-gray-400">Политики не найдены</p>
          ) : (
            policies.map((p) => {
              const active = assignedSet.has(p.id);

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={active}
                      onCheckedChange={() => {}}
                    />
                    <span className="font-medium">{p.name}</span>
                  </div>

                  <Button
                    size="sm"
                    disabled={processingId === p.id || !roleId}
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
