import { useState, useEffect } from "react";
import ConfirmModal from "../components/modals/ConfirmModal";
import CreatePolicyModal from "../components/modals/CreatePolicyModal";
import EditPolicyModal from "../components/modals/EditPolicyModal";
import PolicyDetailsPanel from "../components/panels/PolicyDetailsPanel";
import ActionMenuPolicy from "../components/ActionMenuPolicy";
import PolicyPieChart from "../components/charts/PolicyPieChart";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import Access from "../components/Access";
import { toast } from "sonner";
import { formatDateTime } from "../utils/time";
import { api } from "../services/api";

/* =========================
   Types
========================= */
interface Policy {
  id: number;
  name: string;
  type: string;
  status: string;
  updated_at: string;

  mfa_required?: boolean;
  time_start?: string;
  time_end?: string;
  ip_range?: string;
  session_limit?: number;
  enforce_all_policies?: boolean;

  roles?: {
    id: number;
    name: string;
  }[];
}

interface PolicyHistory {
  id: number;
  action: string;
  timestamp: string;
  user?: string;
  details?: {
    changes?: Record<string, [any, any]>;
  };
}

interface PolicyUsage {
  roles: number | { id: number; name?: string }[];
  users: number | { id: number; email?: string }[];
  active_sessions: number;
}

interface NormalizedPolicyUsage {
  roles: number;
  users: number;
  active_sessions: number;
}

/* =========================
   Helpers
========================= */
const normalizeStatus = (s: string): string => {
  if (!s) return "active";
  const st = s.toLowerCase();
  if (st.includes("акт")) return "active";
  if (st.includes("откл")) return "disabled";
  if (st === "disabled") return "disabled";
  if (st === "active") return "active";
  return st;
};

const toCount = (value: unknown): number => {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
};

const normalizeUsage = (usage: PolicyUsage | null | undefined): NormalizedPolicyUsage => {
  return {
    roles: toCount(usage?.roles),
    users: toCount(usage?.users),
    active_sessions:
      typeof usage?.active_sessions === "number" && Number.isFinite(usage.active_sessions)
        ? usage.active_sessions
        : 0,
  };
};

/* =========================
   Component
========================= */
export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [policyDetails, setPolicyDetails] = useState<Policy | null>(null);
  const [policyHistory, setPolicyHistory] = useState<PolicyHistory[]>([]);

  const [selected, setSelected] = useState<Policy | null>(null);
  const [action, setAction] =
    useState<"delete" | "disable" | "activate" | null>(null);
  const [riskUsage, setRiskUsage] = useState<NormalizedPolicyUsage | null>(null);
  const [riskOpen, setRiskOpen] = useState(false);

  /* =========================
     Load policies list
  ========================= */
  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await api.get<Policy[]>("/policies/list");

      setPolicies(
        Array.isArray(data)
          ? data.map((p) => ({
              ...p,
              status: normalizeStatus(p.status),
            }))
          : []
      );
    } catch {
      toast.error("Ошибка загрузки политик");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  /* =========================
     Load details + history
  ========================= */
  const loadPolicyDetails = async (policyId: number) => {
    try {
      setDetailsLoading(true);
      setPolicyHistory([]);

      const policy = policies.find((p) => p.id === policyId);
      if (!policy) throw new Error("Policy not found in state");

      setPolicyDetails(policy);

      const history = await api.get<PolicyHistory[]>(
        `/policies/${policyId}/history`
      );

      setPolicyHistory(Array.isArray(history) ? history : []);
      setDetailsOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Ошибка загрузки данных политики");
    } finally {
      setDetailsLoading(false);
    }
  };

  /* =========================
     🔑 CANONICAL refresh
  ========================= */
  const refreshPolicy = async (policyId: number) => {
    try {
      const data = await api.get<Policy[]>("/policies/list");

      const normalized = Array.isArray(data)
        ? data.map((p) => ({
            ...p,
            status: normalizeStatus(p.status),
          }))
        : [];

      setPolicies(normalized);

      const updated = normalized.find((p) => p.id === policyId);
      if (updated) setPolicyDetails(updated);

      setDetailsLoading(true);
      const history = await api.get<PolicyHistory[]>(
        `/policies/${policyId}/history`
      );
      setPolicyHistory(Array.isArray(history) ? history : []);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось обновить данные политики");
    } finally {
      setDetailsLoading(false);
    }
  };

  /* =========================
     Actions
  ========================= */
  const confirmAction = async () => {
    if (!selected || !action) return;

    const act = action;
    const policyId = selected.id;

    setAction(null);

    try {
      if (act === "delete") {
        await api.delete(`/policies/${policyId}`);
      }

      if (act === "disable") {
        await api.patch(`/policies/${policyId}`, { status: "disabled" });
      }

      if (act === "activate") {
        await api.patch(`/policies/${policyId}`, { status: "active" });
      }

      toast.success("Операция выполнена");
      loadPolicies();
    } catch {
      toast.error("Ошибка операции");
    } finally {
      setSelected(null);
    }
  };

  /* =========================
     Derived
  ========================= */
  const filtered = policies.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = filtered.filter((p) => p.status === "active").length;
  const disabledCount = filtered.filter((p) => p.status === "disabled").length;

  const handleRiskAction = async (
    policy: Policy,
    act: "delete" | "disable" | "activate"
  ) => {
    try {
      setSelected(policy);

      const usage = await api.get<PolicyUsage>(`/policies/${policy.id}/usage`);
      const normalizedUsage = normalizeUsage(usage);

      const hasImpact =
        normalizedUsage.roles > 0 ||
        normalizedUsage.users > 0 ||
        normalizedUsage.active_sessions > 0;

      if (hasImpact) {
        setRiskUsage(normalizedUsage);
        setAction(act);
        setRiskOpen(true);
        return;
      }

      setAction(act);
    } catch {
      toast.error("Не удалось проверить влияние политики");
    }
  };

  if (loading) return <div className="p-6">Загрузка…</div>;

  /* =========================
     UI
  ========================= */
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
          <Button onClick={() => setCreateOpen(true)}>
            + Создать политику
          </Button>
        </Access>
      </div>

      <div className="bg-[#121A33] rounded-xl overflow-hidden">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#0E1A3A] text-gray-300">
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
                <td className="px-4 py-3">{formatDateTime(p.updated_at)}</td>
                <td className="px-4 py-3 text-right">
                  <ActionMenuPolicy
                    status={p.status}
                    onView={() => loadPolicyDetails(p.id)}
                    onEdit={() => {
                      setSelected(p);
                      setEditOpen(true);
                    }}
                    onDisable={() => handleRiskAction(p, "disable")}
                    onActivate={() => handleRiskAction(p, "activate")}
                    onDelete={() => handleRiskAction(p, "delete")}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!action && !riskOpen}
        title="Подтверждение"
        message="Вы уверены?"
        confirmText="Да"
        onConfirm={confirmAction}
        onClose={() => setAction(null)}
      />

      <ConfirmModal
        open={riskOpen}
        title="⚠️ Влияние политики"
        message={
          riskUsage
            ? `Политика используется:
Ролей: ${riskUsage.roles}
Пользователей: ${riskUsage.users}
Активных сессий: ${riskUsage.active_sessions}

Это может изменить доступы прямо сейчас. Продолжить?`
            : ""
        }
        confirmText="Продолжить"
        onConfirm={async () => {
          setRiskOpen(false);
          await confirmAction();
        }}
        onClose={() => setRiskOpen(false)}
      />

      <CreatePolicyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (name, type) => {
          await api.post("/policies/", { name, type, status: "active" });
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

      <PolicyDetailsPanel
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        policy={policyDetails}
        auditLogs={policyHistory}
        loading={detailsLoading}
        onRefreshPolicy={refreshPolicy}
      />
    </div>
  );
}