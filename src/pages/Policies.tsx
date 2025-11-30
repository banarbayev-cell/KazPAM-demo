import { useState } from "react";
import ConfirmModal from "../components/modals/ConfirmModal";
import CreatePolicyModal from "../components/modals/CreatePolicyModal";
import ActionMenu from "../components/ActionMenu";
import PolicyPieChart from "../components/charts/PolicyPieChart";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

interface Policy {
  id: number;
  name: string;
  type: string;
  status: string;
  updated_at: string;
}

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([
    { id: 1, name: "Access Control", type: "PAM Policy", status: "active", updated_at: "28.11.2025" },
    { id: 2, name: "SSH Session Recording", type: "Session Policy", status: "disabled", updated_at: "26.11.2025" },
    { id: 3, name: "Password Rotation", type: "Security Policy", status: "active", updated_at: "25.11.2025" },
    { id: 4, name: "MFA Enforcement", type: "Access Policy", status: "disabled", updated_at: "20.11.2025" },
  ]);

  // filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // selection & modals
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [modalAction, setModalAction] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);

  // sort & pagination
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const activeCount = policies.filter(p => p.status === "active").length;
  const disabledCount = policies.filter(p => p.status === "disabled").length;

  const filtered = policies.filter((p) => {
    const matchesText = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || p.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.status === "active") ||
      (statusFilter === "disabled" && p.status === "disabled");

    return matchesText && matchesType && matchesStatus;
  });

  // sorting
  const sortedPolicies = [...filtered].sort((a, b) => {
    const valA = a[sortField as keyof Policy];
    const valB = b[sortField as keyof Policy];

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // pagination
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = sortedPolicies.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedPolicies.length / rowsPerPage);

  const changeSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // modal actions
  const openModal = (policy: Policy, action: string) => {
    setSelectedPolicy(policy);
    setModalAction(action);
  };

  const closeModal = () => {
    setSelectedPolicy(null);
    setModalAction("");
  };

  const confirmAction = () => {
    if (modalAction === "disable") {
      setPolicies(prev => prev.map(p => p.id === selectedPolicy?.id ? { ...p, status: "disabled" } : p));
    }
    if (modalAction === "activate") {
      setPolicies(prev => prev.map(p => p.id === selectedPolicy?.id ? { ...p, status: "active" } : p));
    }
    if (modalAction === "delete") {
      setPolicies(prev => prev.filter(p => p.id !== selectedPolicy?.id));
    }
    closeModal();
  };

  const handleCreatePolicy = (name: string, type: string) => {
    const newPolicy: Policy = {
      id: policies.length + 1,
      name,
      type,
      status: "active",
      updated_at: new Date().toLocaleDateString(),
    };
    setPolicies(prev => [...prev, newPolicy]);
    setCreateModalOpen(false);
  };

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">

      <h1 className="text-3xl font-bold mb-4">Политики доступа</h1>

      <div className="flex gap-4 mb-6">
        <PolicyPieChart active={activeCount} disabled={disabledCount} />

        <div className="flex flex-col justify-center gap-3">
          <div className="px-4 py-2 bg-green-100 border border-green-400 rounded-xl text-green-700 font-medium">
            Активных: {activeCount}
          </div>
          <div className="px-4 py-2 bg-red-100 border border-red-400 rounded-xl text-red-700 font-medium">
            Отключённых: {disabledCount}
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="flex gap-3 items-center mb-6">
        <Input
          placeholder="Поиск по названию..."
          className="w-72 bg-white border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="bg-white border border-gray-300 rounded-lg p-2"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">Все типы</option>
          <option value="PAM Policy">PAM Policy</option>
          <option value="Session Policy">Session Policy</option>
          <option value="Security Policy">Security Policy</option>
          <option value="Access Policy">Access Policy</option>
        </select>

        <select
          className="bg-white border border-gray-300 rounded-lg p-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="disabled">Отключенные</option>
        </select>

        <Button onClick={() => setCreateModalOpen(true)}>+ Создать политику</Button>
      </div>

      {/* scrollable table */}
<div className="overflow-y-auto max-h-[500px] rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33]">
  <table className="w-full text-sm text-white">
    <thead className="bg-[#1A243F] text-gray-300 sticky top-0 z-10">
      <tr>
        <th className="p-3 text-left cursor-pointer" onClick={() => changeSort("name")}>
          Название {sortField === "name" && (sortDirection === "asc" ? "▲" : "▼")}
        </th>
        <th className="p-3 text-left cursor-pointer" onClick={() => changeSort("type")}>
          Тип {sortField === "type" && (sortDirection === "asc" ? "▲" : "▼")}
        </th>
        <th className="p-3 text-left cursor-pointer" onClick={() => changeSort("status")}>
          Статус {sortField === "status" && (sortDirection === "asc" ? "▲" : "▼")}
        </th>
        <th className="p-3 text-left cursor-pointer" onClick={() => changeSort("updated_at")}>
          Последнее изменение {sortField === "updated_at" && (sortDirection === "asc" ? "▲" : "▼")}
        </th>
        <th className="p-3 text-left">Действия</th>
      </tr>
    </thead>

    <tbody>
      {currentRows.map((policy) => (
        <tr
          key={policy.id}
          className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] transition"
        >
          <td className="p-3">{policy.name}</td>
          <td className="p-3 text-gray-300">{policy.type}</td>

          <td className="p-3">
            {policy.status === "active" ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-700 text-white">
                Активна
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-700 text-white">
                Отключена
              </span>
            )}
          </td>

          <td className="p-3 text-gray-300">{policy.updated_at}</td>

          <td className="p-3 text-sm">
            <ActionMenu
              status={policy.status}
              onDisable={() => openModal(policy, "disable")}
              onActivate={() => openModal(policy, "activate")}
              onDelete={() => openModal(policy, "delete")}
            />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

      {/* pagination */}
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
          <button className="px-2" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
            {"<<"}
          </button>

          <button className="px-2" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
            {"<"}
          </button>

          <span className="font-medium">{currentPage} / {totalPages}</span>

          <button className="px-2" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
            {">"}
          </button>

          <button className="px-2" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
            {">>"}
          </button>
        </div>
      </div>

      {/* modals */}
      {selectedPolicy && (
        <ConfirmModal
          title={
            modalAction === "disable"
              ? "Отключение политики"
              : modalAction === "activate"
              ? "Активация политики"
              : "Удаление политики"
          }
          message={`Вы уверены, что хотите ${
            modalAction === "disable"
              ? "отключить"
              : modalAction === "activate"
              ? "активировать"
              : "удалить"
          } политику "${selectedPolicy.name}"?`}
          confirmText={
            modalAction === "disable"
              ? "Отключить"
              : modalAction === "activate"
              ? "Активировать"
              : "Удалить"
          }
          onConfirm={confirmAction}
          onClose={closeModal}
        />
      )}

      {createModalOpen && (
        <CreatePolicyModal onClose={() => setCreateModalOpen(false)} onCreate={handleCreatePolicy} />
      )}
    </div>
  );
}
