import { useState } from "react";
import { Plus, User2 } from "lucide-react";
import ActionMenu from "../components/ActionMenu";
import CreateUserModal from "../components/modals/CreateUserModal";

interface User {
  name: string;
  role: string;
  status: "active" | "disabled";
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([
    { name: "admin", role: "Администратор", status: "active" },
    { name: "security", role: "Офицер безопасности", status: "active" },
    { name: "operator01", role: "Оператор", status: "disabled" },
    { name: "root", role: "Супер пользователь", status: "active" },
  ]);

  const [openModal, setOpenModal] = useState(false);

  const handleCreate = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
  };

  const handleActivate = (index: number) => {
    setUsers((prev) =>
      prev.map((u, i) => (i === index ? { ...u, status: "active" } : u))
    );
  };

  const handleDisable = (index: number) => {
    setUsers((prev) =>
      prev.map((u, i) => (i === index ? { ...u, status: "disabled" } : u))
    );
  };

  const handleDelete = (index: number) => {
    setUsers((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen text-[var(--text)] p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Пользователи
          </h1>
          <p className="text-gray-600 mb-6 text-lg">
            Управление учётными записями и ролями доступа
          </p>
        </div>

        <button className="k-btn-primary flex items-center gap-2" onClick={() => setOpenModal(true)}>
          <Plus className="w-4 h-4" /> Создать пользователя
        </button>
      </div>

      <div className="table-container">
        <table className="k-table">
          <thead>
            <tr>
              <th className="k-th">Имя</th>
              <th className="k-th">Роль</th>
              <th className="k-th">Статус</th>
              <th className="k-th">Действия</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user, index) => (
              <tr key={index} className="hover:bg-[#0E1A3A] transition">
                <td className="k-td flex items-center gap-2">
                  <User2 className="w-4 h-4 text-[var(--neon)]" />
                  {user.name}
                </td>

                <td className="k-td text-[var(--text-secondary)]">
                  {user.role}
                </td>

                <td className="k-td">
                  <span
                    className={`${
                      user.status === "active"
                        ? "chip-active"
                        : "chip-disabled"
                    }`}
                  >
                    {user.status === "active" ? "Активен" : "Отключён"}
                  </span>
                </td>

                <td className="k-td">
                  <ActionMenu
                    status={user.status}
                    onActivate={() => handleActivate(index)}
                    onDisable={() => handleDisable(index)}
                    onDelete={() => handleDelete(index)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateUserModal open={openModal} onClose={() => setOpenModal(false)} onCreate={handleCreate} />
    </div>
  );
}
