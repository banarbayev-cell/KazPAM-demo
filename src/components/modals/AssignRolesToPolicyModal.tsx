import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../services/api";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import Access from "../Access";

/* =========================
   Types
========================= */
interface Role {
  id: number;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;

  policyId: number;
  policyName?: string;

  assignedRoles: Role[]; // from parent (source of truth)
  onChanged: () => Promise<void> | void; // refresh callback
}

/* =========================
   Component
========================= */
export default function AssignRolesToPolicyModal({
  open,
  onClose,
  policyId,
  policyName,
  assignedRoles,
  onChanged,
}: Props) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  // ✅ LOCAL STATE — для мгновенного UI (НЕ ломает parent)
  const [localAssigned, setLocalAssigned] = useState<Role[]>([]);

  /* =========================
     Load roles on open
  ========================= */
  useEffect(() => {
    if (!open) return;

    setQ("");
    setLoading(true);

    api
      .get<Role[]>("/roles/")
      .then((data) => setRoles(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Ошибка загрузки ролей"))
      .finally(() => setLoading(false));
  }, [open]);

  /* =========================
     Sync local assigned roles
  ========================= */
  useEffect(() => {
    if (!open) return;
    setLocalAssigned(assignedRoles || []);
  }, [open, assignedRoles]);

  /* =========================
     Derived
  ========================= */
  const assignedSet = useMemo(() => {
    return new Set(localAssigned.map((r) => r.id));
  }, [localAssigned]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(query));
  }, [roles, q]);

  /* =========================
     Toggle role
  ========================= */
  const toggle = async (role: Role) => {
    try {
      setLoading(true);

      if (assignedSet.has(role.id)) {
        await api.delete(`/roles/${role.id}/remove_policy/${policyId}`);

        // ✅ optimistic UI
        setLocalAssigned((prev) =>
          prev.filter((r) => r.id !== role.id)
        );

        toast.success(`Роль "${role.name}" отвязана`);
      } else {
        await api.post(`/roles/${role.id}/add_policy/${policyId}`);

        // ✅ optimistic UI
        setLocalAssigned((prev) => [...prev, role]);

        toast.success(`Роль "${role.name}" привязана`);
      }

      // ✅ parent refresh (без reload)
      await onChanged();
    } catch (e) {
      console.error(e);
      toast.error("Ошибка обновления ролей политики");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  /* =========================
     UI
  ========================= */
  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
      <div className="w-[520px] bg-[#121A33] border border-[#1E2A45] rounded-2xl shadow-xl p-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-bold">Роли политики</div>
            <div className="text-xs text-gray-400 mt-1">
              {policyName
                ? `Политика: ${policyName}`
                : `Policy ID: ${policyId}`}
            </div>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-300 hover:text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск роли..."
            className="bg-[#0E1A3A] border-[#1E2A45] text-white placeholder:text-gray-500"
          />
        </div>

        {/* Roles list */}
        <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
          {loading && roles.length === 0 ? (
            <div className="text-gray-400 text-sm">Загрузка…</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-400 text-sm">Роли не найдены</div>
          ) : (
            filtered.map((role) => {
              const assigned = assignedSet.has(role.id);

              return (
                <div
                  key={role.id}
                  className="flex items-center justify-between bg-[#0E1A3A] border border-[#1E2A45] rounded-xl px-3 py-2"
                >
                  <div className="text-sm">{role.name}</div>

                  <Access permission="manage_policies">
                    <Button
                      size="sm"
                      disabled={loading}
                      className={
                        assigned
                          ? "bg-[#1A243F] hover:bg-[#0E1A3A] border border-[#1E2A45] text-gray-200"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }
                      onClick={() => toggle(role)}
                    >
                      {assigned ? "Убрать" : "Добавить"}
                    </Button>
                  </Access>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <Button
            variant="secondary"
            className="bg-[#1A243F] hover:bg-[#0E1A3A] border border-[#1E2A45] text-gray-200"
            onClick={onClose}
          >
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
