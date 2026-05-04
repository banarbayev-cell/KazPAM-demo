import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [saving, setSaving] = useState(false);

  /* =======================
     Lock background scroll
  ======================= */
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  /* =======================
     Close on ESC
  ======================= */
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, saving]);

  /* =======================
     Load roles
  ======================= */
  useEffect(() => {
    if (!open) return;

    const loadRoles = async () => {
      try {
        const data = await api.get<Role[]>("/roles/");
        setRoles(Array.isArray(data) ? data : []);
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
    if (saving) return;

    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  /* =======================
     Close modal
  ======================= */
  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  /* =======================
     Save roles (diff-based)
  ======================= */
  const handleSave = async () => {
    if (!userId || saving) return;

    setSaving(true);

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
    } finally {
      setSaving(false);
    }
  };

  /* =======================
     Render
  ======================= */
  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="relative z-[100000] w-[420px] max-w-[95vw] rounded-2xl border border-[#1E2A45] bg-[#121A33] p-6 text-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-white">
            Назначить роли
          </h2>
        </div>

        <div className="max-h-72 space-y-3 overflow-y-auto pr-2">
          {roles.length > 0 ? (
            roles.map((role) => (
              <label
                key={role.id}
                className={`flex select-none items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[#0E1A3A] ${
                  saving ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
              >
                <Checkbox
                  checked={selectedRoles.includes(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                />

                <span className="text-gray-300">{role.name}</span>
              </label>
            ))
          ) : (
            <div className="text-sm text-gray-400">
              Роли не найдены
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            onClick={handleClose}
            disabled={saving}
            className="border border-[#1E2A45] bg-[#1A243F] text-white hover:bg-[#232F55] disabled:opacity-60"
          >
            Отмена
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !userId}
            className="bg-[#0052FF] text-white hover:bg-[#0046DB] disabled:opacity-60"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}