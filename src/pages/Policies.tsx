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
import { api } from "../services/api";

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

    api
      .get<Policy[]>("/policies/list")
      .then((data) => {
        const normalized = data.map((p) => ({
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
  // ПОИСК И ФИЛЬТРЫ
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
  const [rowsPerPage] = useState(10);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);

  // -----------------------------
  // МОДАЛКИ
  // -----------------------------
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [modalAction, setModalAction] = useState("");

  const openModal = (policy: Policy, action: string) => {
    setSelectedPolicy(policy);
    setModalAction(action);
  };

  const closeModal = () => {
    setSelectedPolicy(null);
    setModalAction("");
  };

  // -----------------------------
  // CONFIRM ACTION
  // -----------------------------
  const confirmAction = async () => {
    if (!selectedPolicy) return;
    const id = selectedPolicy.id;

    try {
      if (modalAction === "delete") {
        await api.delete(`/policies/${id}`);
        toast.success("Политика удалена");
      }

      if (modalAction === "disable") {
        await api.patch(`/policies/${id}`, { status: "disabled" });
        toast.info("Политика отключена");
      }

      if (modalAction === "activate") {
        await api.patch(`/policies/${id}`, { status: "active" });
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
      await api.post("/policies", { name, type, status: "active" });
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
    await api.patch(`/policies/${id}`, { name, type, status });
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
      </div>

      {/* Фильтры + Создать */}
      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Поиск..."
          className="w-72 bg-white border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Access permission="managePolicies">
          <Button onClick={() => setCreateModalOpen(true)}>
            + Создать политику
          </Button>
        </Access>
      </div>

      {/* Таблица */}
      <div className="overflow-y-auto bg-[#121A33] rounded-xl">
        <table className="w-full text-sm text-white">
          <tbody>
            {currentRows.map((policy) => (
              <tr key={policy.id}>
                <td>{policy.name}</td>
                <td>{policy.type}</td>
                <td>{policy.status}</td>
                <td>{formatDateTime(policy.updated_at)}</td>
                <td>
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

      <ConfirmModal
        open={!!selectedPolicy}
        title="Подтверждение"
        message="Вы уверены?"
        confirmText="Да"
        onConfirm={confirmAction}
        onClose={closeModal}
      />

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
