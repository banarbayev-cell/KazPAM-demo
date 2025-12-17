import { useState, useEffect, useMemo } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import AssignPoliciesModal from "../components/modals/AssignPoliciesModal";
import ActionMenuRole from "../components/ActionMenuRole";
import { toast } from "sonner";
import { api } from "@/services/api";

interface Policy {
  id: number;
  name: string;
  type: string;
  status: string;
}

interface Role {
  id: number;
  name: string;
  policies: Policy[] | null;
}

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);

  // --------------------------------------------------
  // LOAD ROLES (поддержка обоих форматов API)
  // --------------------------------------------------
  const loadRoles = async () => {
    try {
      const data = await api.get<any>(
        `/roles/?page=${currentPage}&limit=${rowsPerPage}`
      );

      // ✅ Формат 1: backend вернул массив
      if (Array.isArray(data)) {
        setRoles(data);
        setTotalPages(1);
        return;
      }

      // ✅ Формат 2: backend вернул пагинацию
      if (Array.isArray(data.items)) {
        setRoles(data.items);
        setTotalPages(Math.ceil((data.total || data.items.length) / rowsPerPage));
        return;
      }

      // ❌ Неверный формат
      console.error("Неверный формат API:", data);
      toast.error("Ошибка данных от сервера");
      setRoles([]);
      setTotalPages(1);
    } catch (err) {
      console.error("Ошибка загрузки ролей:", err);
      toast.error("Ошибка загрузки ролей");
      setRoles([]);
      setTotalPages(1);
    }
  };

  useEffect(() => {
    loadRoles();
  }, [currentPage]);

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------
  const filtered = useMemo(() => {
    return roles.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [roles, search]);

  const openAssignModal = (id: number) => {
    setSelectedRoleId(id);
    setAssignOpen(true);
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
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

        <Button onClick={() => toast.info("Создание роли будет добавлено позже")}>
          + Создать роль
        </Button>
      </div>

      {/* TABLE */}
      <div className="overflow-y-auto max-h-[550px] bg-[#121A33] border border-[#1E2A45] rounded-xl shadow-xl">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left">Название</th>
              <th className="p-3 text-left">Привязанные политики</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((role) => (
              <tr
                key={role.id}
                className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] transition"
              >
                <td className="p-3">{role.name}</td>

                <td className="p-3">
                  {!role.policies || role.policies.length === 0 ? (
                    <span className="text-gray-400">Нет политик</span>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {role.policies.map((p) => (
                        <span
                          key={p.id}
                          className="px-3 py-1 bg-blue-700 rounded-full text-xs font-bold"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                <td className="p-3">
                  <ActionMenuRole
                    onAssign={() => openAssignModal(role.id)}
                    onEdit={() => toast.info("Редактирование роли")}
                    onDelete={() => toast.info("Удаление роли")}
                    onPermissions={() => toast.info("Права роли")}
                  />
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-400">
                  Роли не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center p-4 text-gray-900 mt-3">
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
            {"<<"}
          </button>

          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            {"<"}
          </button>

          <span>
            {currentPage} / {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            {">"}
          </button>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
          >
            {">>"}
          </button>
        </div>
      </div>

      {/* MODAL */}
      <AssignPoliciesModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        roleId={selectedRoleId}
        onAssigned={loadRoles}
      />
    </div>
  );
}
