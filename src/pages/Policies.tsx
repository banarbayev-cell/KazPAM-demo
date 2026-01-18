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
// NORMALIZE STATUS
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

  const loadPolicies = () => {
    setLoading(true);
    api
      .get<Policy[]>("/policies/list")
      .then((data) => {
        setPolicies(
          data.map((p) => ({
            ...p,
            status: normalizeStatus(p.status),
          }))
        );
        setLoading(false);
      })
      .catch(() => {
        toast.error("Ошибка загрузки политик");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const [search, setSearch] = useState("");

  const filtered = policies.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = filtered.filter((p) => p.status === "active").length;
  const disabledCount = filtered.filter((p) => p.status === "disabled").length;

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Policy | null>(null);
  const [action, setAction] = useState<"delete" | "disable" | "activate" | null>(
    null
  );

  const confirmAction = async () => {
    if (!selected || !action) return;
    try {
      if (action === "delete") await api.delete(`/policies/${selected.id}`);
      if (action === "disable")
        await api.patch(`/policies/${selected.id}`, { status: "disabled" });
      if (action === "activate")
        await api.patch(`/policies/${selected.id}`, { status: "active" });
      toast.success("Операция выполнена");
      loadPolicies();
    } catch {
      toast.error("Ошибка операции");
    } finally {
      setAction(null);
      setSelected(null);
    }
  };

  if (loading) {
    return <div className="p-6">Загрузка…</div>;
  }

  // EMPTY STATE
  if (policies.length === 0) {
    return (
      <div className="p-6 w-full bg-gray-100 text-gray-900">
        <h1 className="text-3xl font-bold mb-4">Политики доступа</h1>

        <div className="bg-[#121A33] rounded-2xl border border-[#1E2A45] p-6 text-white">
          <div className="text-lg font-semibold mb-2">
            Политики доступа не созданы
          </div>
          <div className="text-sm text-gray-300 mb-4 max-w-2xl">
            Создайте первую политику, чтобы управлять доступом: MFA, ограничения
            по времени и IP, лимиты сессий и Zero Trust.
          </div>

          
            <Button
  variant="default"
  className="bg-blue-600 hover:bg-blue-700 text-white"
  onClick={() => setCreateOpen(true)}
>
  + Создать первую политику
</Button>
        
        </div>

        <CreatePolicyModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={async (name, type) => {
            await api.post("/policies", { name, type, status: "active" });
            toast.success("Политика создана");
            setCreateOpen(false);
            loadPolicies();
          }}
        />
      </div>
    );
  }

  // MAIN UI
  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-4">Политики доступа</h1>

        <div className="mb-6">
  <PolicyPieChart
    active={activeCount}
    disabled={disabledCount}
    title="Статистика"
  />
</div>


      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Поиск..."
          className="w-72 bg-white border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Access permission="manage_policies">
          <Button onClick={() => setCreateOpen(true)}>+ Создать политику</Button>
        </Access>
      </div>

      <div className="bg-[#121A33] rounded-xl overflow-hidden">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#0E1A3A] text-gray-300 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Название</th>
              <th className="px-4 py-3 text-left">Тип</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-left">Обновлено</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-[#1E2A45]">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.type}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">
                  {formatDateTime(p.updated_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <ActionMenuPolicy
                    status={p.status}
                    onView={() => {
                      setSelected(p);
                      setDetailOpen(true);
                    }}
                    onEdit={() => {
                      setSelected(p);
                      setEditOpen(true);
                    }}
                    onDisable={() => {
                      setSelected(p);
                      setAction("disable");
                    }}
                    onActivate={() => {
                      setSelected(p);
                      setAction("activate");
                    }}
                    onDelete={() => {
                      setSelected(p);
                      setAction("delete");
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!action}
        title="Подтверждение"
        message="Вы уверены?"
        confirmText="Да"
        onConfirm={confirmAction}
        onClose={() => setAction(null)}
      />

      <CreatePolicyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (name, type) => {
          await api.post("/policies", { name, type, status: "active" });
          toast.success("Политика создана");
          setCreateOpen(false);
          loadPolicies();
        }}
      />

      <EditPolicyModal
        open={editOpen}
        policy={selected}
        onClose={() => setEditOpen(false)}
        onSave={async (id, name, type, status) => {
          await api.patch(`/policies/${id}`, { name, type, status });
          toast.success("Политика обновлена");
          setEditOpen(false);
          loadPolicies();
        }}
      />

      <PolicyDetailModal
        open={detailOpen}
        policy={selected}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
