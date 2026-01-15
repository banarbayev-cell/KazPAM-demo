import { useState, useEffect, useMemo } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import AssignPoliciesModal from "../components/modals/AssignPoliciesModal";
import AssignPermissionsModal from "../components/modals/AssignPermissionsModal";
import DeleteRoleConfirmModal from "../components/modals/DeleteRoleConfirmModal";
import EditRoleModal from "../components/modals/EditRoleModal";
import CreateRoleModal from "../components/modals/CreateRoleModal";
import ActionMenuRole from "../components/ActionMenuRole";
import { toast } from "sonner";
import { api } from "../services/api";

/* =======================
   Types
======================= */

interface Policy {
  id: number;
  name: string;
  type: string;
  status: string;
}

interface Permission {
  id: number;
  code: string;
}

interface Role {
  id: number;
  name: string;
  policies: Policy[] | null;
  permissions: Permission[];
}

/* =======================
   Component
======================= */

export default function Roles() {


  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");

  /* ----- Policies ----- */
  const [assignPoliciesOpen, setAssignPoliciesOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  /* ----- Permissions ----- */
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  /* ----- Delete role ----- */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ----- Edit role ----- */
  const [editOpen, setEditOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);

  /* ----- Create role ----- */
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  /* ----- Pagination ----- */
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);

  /* =======================
     API helpers
  ======================= */

  const authHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const loadRoles = async () => {
    try {
      const data = await api.get<any>(
        `/roles/?page=${currentPage}&limit=${rowsPerPage}`
      );

      if (Array.isArray(data)) {
        setRoles(data);
        setTotalPages(1);
        return;
      }

      if (Array.isArray(data.items)) {
        setRoles(data.items);
        setTotalPages(
          Math.ceil((data.total || data.items.length) / rowsPerPage)
        );
        return;
      }

      toast.error("Неверный формат данных от сервера");
      setRoles([]);
    } catch {
      toast.error("Ошибка загрузки ролей");
      setRoles([]);
    }
  };

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  /* =======================
     CRUD actions
  ======================= */

  const createRole = async (name: string) => {
    setCreateLoading(true);
    try {
      await api.post("/roles", { name });

      toast.success("Роль создана");
      setCreateOpen(false);
      loadRoles();
    } catch (e: any) {
      toast.error(e.message || "Не удалось создать роль");
    } finally {
      setCreateLoading(false);
    }
  };

  const updateRole = async (roleId: number, name: string) => {
    await api.patch(`/roles/${roleId}`, { name });

  };

  const deleteRole = async () => {
    if (!roleToDelete) return;

    setDeleteLoading(true);
    try {
      await api.delete(`/roles/${roleToDelete.id}`);


      toast.success("Роль удалена");
      setDeleteOpen(false);
      setRoleToDelete(null);
      loadRoles();
    } catch (e: any) {
      toast.error(e.message || "Не удалось удалить роль");
    } finally {
      setDeleteLoading(false);
    }
  };

  /* =======================
     UI helpers
  ======================= */

  const filtered = useMemo(() => {
    return roles.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [roles, search]);

  /* =======================
     Render
  ======================= */

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-4">Роли доступа</h1>

      {/* Search + Create */}
      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Поиск..."
          className="w-72 bg-white border"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        <Button onClick={() => setCreateOpen(true)}>
          + Создать роль
        </Button>
      </div>

      {/* TABLE */}
      <div className="overflow-y-auto max-h-[550px] bg-[#121A33] border border-[#1E2A45] rounded-xl">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300">
            <tr>
              <th className="p-3 text-left">Название</th>
              <th className="p-3 text-left">Политики</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((role) => (
              <tr key={role.id} className="border-t border-[#1E2A45]">
                <td className="p-3">{role.name}</td>

                <td className="p-3">
                  {!role.policies?.length ? (
                    <span className="text-gray-400">Нет</span>
                  ) : (
                    role.policies.map((p) => (
                      <span
                        key={p.id}
                        className="mr-2 px-2 py-1 bg-blue-700 rounded-full text-xs"
                      >
                        {p.name}
                      </span>
                    ))
                  )}
                </td>

                <td className="p-3">
                  <ActionMenuRole
                    role={role}
                    onAssign={() => {
                      setSelectedRoleId(role.id);
                      setAssignPoliciesOpen(true);
                    }}
                    onEdit={() => {
                      setRoleToEdit(role);
                      setEditOpen(true);
                    }}
                    onDelete={() => {
                      setRoleToDelete(role);
                      setDeleteOpen(true);
                    }}
                    onPermissions={() => setSelectedRole(role)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}

      <AssignPoliciesModal
        open={assignPoliciesOpen}
        onClose={() => setAssignPoliciesOpen(false)}
        roleId={selectedRoleId}
        onAssigned={loadRoles}
      />

      {selectedRole && (
        <AssignPermissionsModal
  roleId={selectedRole.id}
  roleName={selectedRole.name}   // ← ВОТ ЭТА СТРОКА
  assignedPermissions={selectedRole.permissions}
  onClose={() => setSelectedRole(null)}
  onUpdated={() => {
    setSelectedRole(null);
    loadRoles();
  }}
/>

      )}

      <DeleteRoleConfirmModal
        isOpen={deleteOpen}
        roleName={roleToDelete?.name || ""}
        onClose={() => {
          if (deleteLoading) return;
          setDeleteOpen(false);
          setRoleToDelete(null);
        }}
        onConfirm={deleteRole}
      />

      <CreateRoleModal
        isOpen={createOpen}
        loading={createLoading}
        onClose={() => setCreateOpen(false)}
        onCreate={createRole}
      />

      <EditRoleModal
        isOpen={editOpen}
        roleName={roleToEdit?.name || ""}
        onClose={() => {
          setEditOpen(false);
          setRoleToEdit(null);
        }}
        onSave={async (newName) => {
          if (!roleToEdit) return;
          try {
            await updateRole(roleToEdit.id, newName);
            toast.success("Роль обновлена");
            setEditOpen(false);
            setRoleToEdit(null);
            loadRoles();
          } catch (e: any) {
            toast.error(e.message || "Не удалось обновить роль");
          }
        }}
      />
    </div>
  );
}
