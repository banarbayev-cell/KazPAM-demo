import { useState, useMemo, useEffect } from "react";
import { User2 } from "lucide-react";

import ActionMenuUser from "../components/ActionMenuUser";
import CreateUserModal from "../components/modals/CreateUserModal";
import AssignRolesModal from "../components/modals/AssignRolesModal";
import ConfirmModal from "../components/modals/ConfirmModal";
import EffectivePermissionsModal from "../components/modals/EffectivePermissionsModal";

import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { api } from "../services/api";

interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  email: string;
  roles: Role[];
  is_active: boolean;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [search, setSearch] = useState("");

  const [assignRolesOpen, setAssignRolesOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const selectedUser = users.find((u) => u.id === selectedUserId) || null;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [isEffectivePermsOpen, setIsEffectivePermsOpen] = useState(false);
  const [effectivePermsUser, setEffectivePermsUser] = useState<any | null>(null);

  // NEW: роли пользователя с policies+permissions (lazy-load только по клику)
  const [effectiveRoles, setEffectiveRoles] = useState<any[]>([]);
  const [effectiveLoading, setEffectiveLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ------------------------------
  // LOAD USERS
  // ------------------------------
  const fetchUsers = async () => {
    try {
      const data = await api.get<User[]>("/users/");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки пользователей:", err);
      toast.error("Ошибка загрузки пользователей");
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, rowsPerPage]);

  // ------------------------------
  // STATS
  // ------------------------------
  const total = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const disabledCount = users.filter((u) => !u.is_active).length;
  const adminsCount = users.filter((u) =>
    u.roles.some((r) => r.name.toLowerCase().includes("admin"))
  ).length;

  // ------------------------------
  // FILTER
  // ------------------------------
  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchEmail = user.email.toLowerCase().includes(search.toLowerCase());

      const matchRole = user.roles.some((r) =>
        r.name.toLowerCase().includes(search.toLowerCase())
      );

      return matchEmail || matchRole;
    });
  }, [users, search]);

  // ------------------------------
  // PAGINATION
  // ------------------------------
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);

  const goToPage = (page: number) => setCurrentPage(page);

  // ------------------------------
  // CREATE USER
  // ------------------------------
  const handleCreateUser = async (data: { email: string; password: string }) => {
    try {
      await api.post("/users/", data);
      toast.success("Пользователь успешно создан");
      setOpenModal(false);
      fetchUsers();
    } catch (err: any) {
      const message = String(err?.message || "");

      if (message.includes("User already exists")) {
        toast.error("Пользователь с таким email уже существует");
        return;
      }

      if (message.includes("Forbidden")) {
        toast.error("Недостаточно прав для создания пользователя");
        return;
      }

      if (message.includes("Unauthorized")) {
        toast.error("Сессия истекла. Войдите заново");
        return;
      }

      toast.error("Ошибка создания пользователя");
      console.error("Create user error:", err);
    }
  };

  const handleActivateUser = async (userId: number) => {
    try {
      await api.post(`/users/users/${userId}/activate`);
      toast.success("Пользователь активирован");
      fetchUsers();
    } catch {
      toast.error("Ошибка активации пользователя");
    }
  };

  const handleDeactivateUser = async (userId: number) => {
    try {
      await api.post(`/users/users/${userId}/deactivate`);
      toast.success("Пользователь отключён");
      fetchUsers();
    } catch {
      toast.error("Ошибка отключения пользователя");
    }
  };

  const handleResetPassword = async (userId: number, userEmail?: string) => {
    const email = userEmail ?? "неизвестный пользователь";
    const newPassword = crypto.randomUUID().slice(0, 12);

    try {
      await api.post(`/users/${userId}/reset-password`, {
        new_password: newPassword,
      });

      toast.success(`Пароль пользователя ${email} сброшен`);
      toast.info(`Новый пароль для ${email}: ${newPassword}`, { duration: 12000 });
    } catch {
      toast.error(`Ошибка сброса пароля для ${email}`);
    }
  };

  // ------------------------------
  // DELETE USER
  // ------------------------------
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleteLoading(true);
    try {
      await api.delete<void>(`/users/${userToDelete.id}`);
      toast.success("Пользователь удалён");
      fetchUsers();
      setConfirmOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      const msg = String(err?.message || "");

      if (msg === "Forbidden") {
        toast.error("Недостаточно прав");
        return;
      }

      if (msg === "Unauthorized") {
        toast.error("Сессия истекла. Войдите заново");
        return;
      }

      toast.error(msg || "Ошибка удаления пользователя");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ------------------------------
  // NEW: Effective permissions (lazy-load roles with policies+permissions)
  // ------------------------------
  const fetchEffectiveRoles = async (userId: number) => {
    setEffectiveLoading(true);
    try {
      /**
       * ВАЖНО:
       * Этот endpoint должен вернуть роли пользователя в "расширенном" виде:
       * roles[] -> policies[] -> permissions[]
       *
       * Рекомендованный вариант:
       *   GET /roles/?user_id=123
       *
       * Если у тебя другой endpoint - меняешь только ЭТУ строку,
       * остальная архитектура и UI останутся неизменны.
       */
      const data = await api.get<any[]>(`/roles/?user_id=${userId}`);
      setEffectiveRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки effective roles:", err);
      toast.error("Не удалось загрузить права пользователя");
      setEffectiveRoles([]);
    } finally {
      setEffectiveLoading(false);
    }
  };

  useEffect(() => {
    if (isEffectivePermsOpen && effectivePermsUser?.id) {
      fetchEffectiveRoles(effectivePermsUser.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEffectivePermsOpen, effectivePermsUser]);

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-6">Пользователи</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[#121A33] p-4 rounded-xl shadow-md text-white">
          <p className="text-gray-400 text-sm">Всего пользователей</p>
          <p className="text-3xl font-bold">{total}</p>
        </div>

        <div className="bg-[#121A33] p-4 rounded-xl shadow-md text-white">
          <p className="text-gray-400 text-sm">Активные</p>
          <p className="text-3xl font-bold text-green-400">{activeCount}</p>
        </div>

        <div className="bg-[#121A33] p-4 rounded-xl shadow-md text-white">
          <p className="text-gray-400 text-sm">Отключенные</p>
          <p className="text-3xl font-bold text-red-400">{disabledCount}</p>
        </div>

        <div className="bg-[#121A33] p-4 rounded-xl shadow-md text-white">
          <p className="text-gray-400 text-sm">Администраторы</p>
          <p className="text-3xl font-bold text-blue-400">{adminsCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center mb-6">
        <Input
          placeholder="Поиск по email или роли..."
          className="w-72 bg-white border text-gray-900 placeholder-gray-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Button onClick={() => setOpenModal(true)}>+ Создать пользователя</Button>
      </div>

      {/* TABLE */}
      <div className="overflow-y-auto max-h-[500px] rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33]">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Статус</th>
              <th className="p-3 text-left">Роли</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>

          <tbody>
            {currentRows.map((user) => (
              <tr
                key={user.id}
                className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] transition"
              >
                <td className="p-3 flex items-center gap-2">
                  <User2 className="w-4 h-4 text-[#3BE3FD]" />
                  {user.email}
                </td>

                <td className="p-3">
                  {user.is_active ? (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold
                     bg-green-500/20 text-green-400 border border-green-500/30"
                    >
                      Активен
                    </span>
                  ) : (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold
                     bg-red-500/20 text-red-400 border border-red-500/30"
                    >
                      Отключён
                    </span>
                  )}
                </td>

                <td className="p-3">
                  {user.roles.length === 0 ? (
                    <span className="text-gray-400 text-sm">Нет ролей</span>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {user.roles.map((role) => (
                        <span
                          key={role.id}
                          className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white"
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                <td className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <ActionMenuUser
                      status={user.is_active ? "active" : "disabled"}
                      onAssignRoles={() => {
                        setSelectedUserId(user.id);
                        setAssignRolesOpen(true);
                      }}
                      onDisable={() => handleDeactivateUser(user.id)}
                      onActivate={() => handleActivateUser(user.id)}
                      onResetPassword={() => handleResetPassword(user.id, user.email)}
                      onDelete={() => {
                        setUserToDelete(user);
                        setConfirmOpen(true);
                      }}
                    />

                    {/* NEW: Safe extra button, does not touch ActionMenuUser */}
                    <button
                      onClick={() => {
                        setEffectivePermsUser(user);
                        setIsEffectivePermsOpen(true);
                      }}
                      className="rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-3 py-2 text-xs text-gray-200 hover:bg-[#121F49]"
                    >
                      Права
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <span>Показать:</span>
          <select
            className="border p-1 rounded"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <button
            className="px-2 text-black"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
          >
            {"<<"}
          </button>

          <button
            className="px-2 text-black"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {"<"}
          </button>

          <span className="font-medium">
            {currentPage} / {totalPages}
          </span>

          <button
            className="px-2 text-black"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            {">"}
          </button>

          <button
            className="px-2 text-black"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            {">>"}
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreateUserModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreate={handleCreateUser}
      />

      <AssignRolesModal
        open={assignRolesOpen}
        onClose={() => setAssignRolesOpen(false)}
        userId={selectedUserId}
        userRoles={selectedUser?.roles ?? []}
        onAssigned={() => {
          fetchUsers();
          setAssignRolesOpen(false);
          toast.success("Роли успешно обновлены");
        }}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Удалить пользователя"
        message={`Вы уверены, что хотите удалить пользователя ${userToDelete?.email}?`}
        confirmText="Удалить"
        onConfirm={handleDeleteUser}
        onClose={() => {
          setConfirmOpen(false);
          setUserToDelete(null);
        }}
        loading={deleteLoading}
      />

      {/* NEW: Effective permissions modal (read-only, safe) */}
      <EffectivePermissionsModal
        isOpen={isEffectivePermsOpen}
        loading={effectiveLoading}
        onClose={() => {
          setIsEffectivePermsOpen(false);
          setEffectivePermsUser(null);
          setEffectiveRoles([]);
        }}
        user={
          effectivePermsUser
            ? { ...effectivePermsUser, roles: effectiveRoles }
            : null
        }
      />
    </div>
  );
}
