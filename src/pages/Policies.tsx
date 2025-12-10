import { useState, useEffect } from "react";
import ConfirmModal from "../components/modals/ConfirmModal";
import CreatePolicyModal from "../components/modals/CreatePolicyModal";
import EditPolicyModal from "../components/modals/EditPolicyModal";
import PolicyDetailModal from "../components/modals/PolicyDetailModal";
import ActionMenuPolicy from "../components/ActionMenuPolicy";
import PolicyPieChart from "../components/charts/PolicyPieChart";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import Access from "../components/Access";
import { toast } from "sonner";
import { formatDateTime } from "../utils/time";


interface Policy {
  id: number;
  name: string;
  type: string;
  status: string;
  updated_at: string;
}

// -----------------------------
// НОРМАЛИЗАЦИЯ СТАТУСА
// -----------------------------
const normalizeStatus = (s: string): string => {
  if (!s) return "active";
  const st = s.toLowerCase();
  if (st.includes("акт")) return "active";
  if (st.includes("откл")) return "disabled";
  if (st === "disabled") return "disabled";
  if (st === "active") return "active";
  return st;
};

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // ЗАГРУЗКА ПОЛИТИК
  // -----------------------------
  const loadPolicies = () => {
    setLoading(true);

    fetch("http://127.0.0.1:8000/policies/list")
      .then((res) => res.json())
      .then((data) => {
        const normalized = data.map((p: Policy) => ({
          ...p,
          status: normalizeStatus(p.status),
        }));
        setPolicies(normalized);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Ошибка загрузки политик");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  // -----------------------------
  // ПОИСК И ФИЛЬТРЫ  (как раньше)
  // -----------------------------
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = policies.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || p.type === typeFilter;
    const matchStatus =
      statusFilter === "all" || p.status === statusFilter;

    return matchSearch && matchType && matchStatus;
  });

  const activeCount = filtered.filter((p) => p.status === "active").length;
  const disabledCount = filtered.filter((p) => p.status === "disabled").length;

  // -----------------------------
  // ПАГИНАЦИЯ
  // -----------------------------
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));

  // -----------------------------
  // МОДАЛКИ
  // -----------------------------
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [modalAction, setModalAction] = useState("");

  const openModal = (policy: Policy, action: string) => {
    console.log("OPEN MODAL:", policy, action);
    setSelectedPolicy(policy);
    setModalAction(action);
  };

  const closeModal = () => {
    setSelectedPolicy(null);
    setModalAction("");
  };

  // -----------------------------
  // CONFIRM ACTION (DELETE / DISABLE / ACTIVATE)
  // -----------------------------
  const confirmAction = async () => {
    if (!selectedPolicy) return;
    const id = selectedPolicy.id;

    try {
      if (modalAction === "delete") {
        await fetch(`http://127.0.0.1:8000/policies/${id}`, {
          method: "DELETE",
        });
        toast.success("Политика удалена");
      }

      if (modalAction === "disable") {
        await fetch(`http://127.0.0.1:8000/policies/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "disabled" }),
        });
        toast.info("Политика отключена");
      }

      if (modalAction === "activate") {
        await fetch(`http://127.0.0.1:8000/policies/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
        toast.success("Политика активирована");
      }
    } catch (err) {
      console.error(err);
      toast.error("Ошибка выполнения действия");
    }

    closeModal();
    loadPolicies();
  };

  // -----------------------------
  // СОЗДАНИЕ ПОЛИТИКИ
  // -----------------------------
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleCreatePolicy = async (name: string, type: string) => {
    try {
      await fetch("http://127.0.0.1:8000/policies/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, status: "active" }),
      });

      toast.success("Политика создана");
      setCreateModalOpen(false);
      loadPolicies();
    } catch {
      toast.error("Ошибка создания политики");
    }
  };

  // -----------------------------
  // РЕДАКТИРОВАНИЕ
  // -----------------------------
  const [editOpen, setEditOpen] = useState(false);
  const [policyToEdit, setPolicyToEdit] = useState<Policy | null>(null);

  const handleEditPolicy = async (
    id: number,
    name: string,
    type: string,
    status: string
  ) => {
    await fetch(`http://127.0.0.1:8000/policies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, status }),
    });

    toast.success("Политика обновлена");
    setEditOpen(false);
    loadPolicies();
  };

  // -----------------------------
  // VIEW DETAILS
  // -----------------------------
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPolicy, setDetailPolicy] = useState<Policy | null>(null);

  const handleViewDetails = (policy: Policy) => {
    setDetailPolicy(policy);
    setDetailOpen(true);
  };

  // -----------------------------
  // UI
  // -----------------------------
  if (loading) return <div className="p-6">Загрузка...</div>;

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-4">Политики доступа</h1>

      {/* Диаграмма */}
      <div className="flex gap-6 mb-6">
        <div className="w-[260px] h-[260px] bg-white rounded-xl shadow flex items-center justify-center">
          <PolicyPieChart active={activeCount} disabled={disabledCount} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl border">
            Активных: {activeCount}
          </div>
          <div className="px-4 py-2 bg-red-100 text-red-700 rounded-xl border">
            Отключённых: {disabledCount}
          </div>
        </div>
      </div>

      {/* Фильтры + Создать политику */}
      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Поиск..."
          className="w-72 bg-white border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border p-2 rounded bg-white"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">Все типы</option>
          <option value="Access Policy">Access Policy</option>
          <option value="Security Policy">Security Policy</option>
          <option value="Workflow Policy">Workflow Policy</option>
        </select>

        <select
          className="border p-2 rounded bg-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="disabled">Отключённые</option>
        </select>

        <Access permission="managePolicies">
          <Button onClick={() => setCreateModalOpen(true)}>
            + Создать политику
          </Button>
        </Access>
      </div>

      {/* Таблица */}
      <div className="overflow-y-auto max-h-[550px] bg-[#121A33] border border-[#1E2A45] rounded-xl shadow-xl">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300">
            <tr>
              <th className="p-3">Название</th>
              <th className="p-3">Тип</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Обновлена</th>
              <th className="p-3">Действия</th>
            </tr>
          </thead>

          <tbody>
            {currentRows.map((policy) => (
              <tr key={policy.id} className="border-t border-[#1E2A45] hover:bg-[#0E1A3A]">
                <td className="p-3">{policy.name}</td>
                <td className="p-3">{policy.type}</td>
                <td className="p-3">
                  {policy.status === "active" ? (
                    <span className="px-3 py-1 bg-green-700 rounded-full text-xs font-bold">
                      Активна
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-700 rounded-full text-xs font-bold">
                      Отключена
                    </span>
                  )}
                </td>
                <td className="p-3">{formatDateTime(policy.updated_at)}</td>

                <td className="p-3">
                  <ActionMenuPolicy
                    status={policy.status}
                    onView={() => handleViewDetails(policy)}
                    onEdit={() => {
                      setPolicyToEdit(policy);
                      setEditOpen(true);
                    }}
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

      {/* ConfirmModal — теперь работает правильно */}
      <ConfirmModal
        open={!!selectedPolicy}
        title={
          modalAction === "delete"
            ? "Удаление политики"
            : modalAction === "disable"
            ? "Отключение политики"
            : "Активация политики"
        }
        message={
          selectedPolicy
            ? `Вы уверены, что хотите ${
                modalAction === "delete"
                  ? "удалить"
                  : modalAction === "disable"
                  ? "отключить"
                  : "активировать"
              } политику "${selectedPolicy.name}"?`
            : ""
        }
        confirmText={
          modalAction === "delete"
            ? "Удалить"
            : modalAction === "disable"
            ? "Отключить"
            : "Активировать"
        }
        onConfirm={confirmAction}
        onClose={closeModal}
      />

      {/* Остальные модалки */}
      {createModalOpen && (
        <CreatePolicyModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreate={handleCreatePolicy}
        />
      )}

      <EditPolicyModal
        open={editOpen}
        policy={policyToEdit}
        onClose={() => setEditOpen(false)}
        onSave={handleEditPolicy}
      />

      <PolicyDetailModal
        open={detailOpen}
        policy={detailPolicy}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
