import { useState, useMemo, useEffect } from "react";
import { User2 } from "lucide-react";

import ActionMenuUser from "../components/ActionMenuUser";
import CreateUserModal from "../components/modals/CreateUserModal";
import AssignRolesModal from "../components/modals/AssignRolesModal";

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
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [search, setSearch] = useState("");

  const [assignRolesOpen, setAssignRolesOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

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
  const activeCount = users.length;
  const disabledCount = 0;
  const adminsCount = users.filter((u) =>
    u.roles.some((r) => r.name.toLowerCase().includes("admin"))
  ).length;

  // ------------------------------
  // FILTER
  // ------------------------------
  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchEmail = user.email
        .toLowerCase()
        .includes(search.toLowerCase());

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
  // UI
  // ------------------------------
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

        <Button onClick={() => setOpenModal(true)}>
          + Создать пользователя
        </Button>
      </div>

      {/* TABLE */}
      <div className="overflow-y-auto max-h-[500px] rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33]">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left">Email</th>
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

                {/* ACTION MENU */}
                <td className="p-3 text-sm">
                  <ActionMenuUser
                    onView={() =>
                      toast.info("Открыт профиль пользователя")
                    }
                    onAssignRoles={() => {
                      setSelectedUserId(user.id);
                      setAssignRolesOpen(true);
                    }}
                    onResetPassword={() =>
                      toast.info("Функция смены пароля будет добавлена")
                    }
                    onDelete={async () => {
                      toast.info("Удаление пользователя...");

                      try {
                        await api.delete(`/users/${user.id}`);
                        toast.success("Пользователь удалён");
                        fetchUsers();
                      } catch {
                        toast.error("Ошибка при удалении пользователя");
                      }
                    }}
                  />
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

      {/* Create User Modal */}
      <CreateUserModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreate={() => {
          fetchUsers();
          setOpenModal(false);
          toast.success("Пользователь успешно создан");
        }}
      />

      {/* Assign Roles Modal */}
      <AssignRolesModal
        open={assignRolesOpen}
        onClose={() => setAssignRolesOpen(false)}
        userId={selectedUserId}
        onAssigned={() => {
          fetchUsers();
          setAssignRolesOpen(false);
          toast.success("Роли успешно обновлены");
        }}
      />
    </div>
  );
}
