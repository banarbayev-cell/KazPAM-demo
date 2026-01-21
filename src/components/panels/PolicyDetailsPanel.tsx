import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { formatPolicyHistoryAction } from "../../utils/policyHistory";
import AssignRolesToPolicyModal from "../modals/AssignRolesToPolicyModal";
import Access from "../Access";

/* =========================
   Types
========================= */
interface Role {
  id: number;
  name: string;
}

interface PolicyDetailsPanelProps {
  open: boolean;
  onClose: () => void;

  policy: {
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

    roles?: Role[];
  } | null;

  auditLogs?: {
    id: number;
    action: string;
    timestamp: string;
    user?: string;
    details?: {
      changes?: Record<string, [any, any]>;
    };
  }[];

  loading?: boolean;

  // ✅ NEW: безопасный refresh родителя (ничего не ломаем)
  onRefreshPolicy?: (policyId: number) => Promise<void> | void;
}

/* =========================
   Component
========================= */
export default function PolicyDetailsPanel({
  open,
  onClose,
  policy,
  auditLogs = [],
  loading = false,
  onRefreshPolicy,
}: PolicyDetailsPanelProps) {
  const [tab, setTab] = useState<"params" | "roles" | "history">("params");
  const [assignOpen, setAssignOpen] = useState(false);

  const roles = useMemo(() => policy?.roles ?? [], [policy]);

  if (!open || !policy) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[9998] flex justify-end">
      <div className="w-[420px] h-full bg-[#121A33] p-6 shadow-xl overflow-y-auto text-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Политика: {policy.name}</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-300 hover:text-white" />
          </button>
        </div>

        {/* Meta */}
        <div className="space-y-2 text-sm mb-4">
          <div>
            <span className="text-gray-400">Тип:</span>{" "}
            <span className="font-semibold">{policy.type}</span>
          </div>
          <div>
            <span className="text-gray-400">Статус:</span>{" "}
            <span
              className={
                policy.status === "active"
                  ? "text-green-400 font-semibold"
                  : "text-red-400 font-semibold"
              }
            >
              {policy.status === "active" ? "Активна" : "Отключена"}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Обновлена:</span>{" "}
            <span className="font-semibold">{policy.updated_at}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <TabButton active={tab === "params"} onClick={() => setTab("params")}>
            Параметры
          </TabButton>
          <TabButton active={tab === "roles"} onClick={() => setTab("roles")}>
            Роли
          </TabButton>
          <TabButton
            active={tab === "history"}
            onClick={() => setTab("history")}
          >
            История
          </TabButton>
        </div>

        {/* CONTENT */}
        {tab === "params" && (
          <div className="space-y-3 text-sm">
            <Param label="MFA требуется">{policy.mfa_required ? "Да" : "Нет"}</Param>

            <Param label="Окно доступа">
              {policy.time_start && policy.time_end
                ? `${policy.time_start} — ${policy.time_end}`
                : "—"}
            </Param>

            <Param label="Разрешённый диапазон IP">
              {policy.ip_range ?? "—"}
            </Param>

            <Param label="Лимит сессии">
              {policy.session_limit ? `${policy.session_limit} минут` : "—"}
            </Param>

            <Param label="Применять все политики">
              {policy.enforce_all_policies ? "Да" : "Нет"}
            </Param>
          </div>
        )}

        {tab === "roles" && (
          <div className="space-y-3 text-sm">
            <Access permission="manage_policies">
              <button
                onClick={() => setAssignOpen(true)}
                className="w-full px-3 py-2 rounded-md bg-[#0E1A3A] border border-[#1E2A45] hover:border-[#3BE3FD] transition"
              >
                Управление ролями
              </button>
            </Access>

            {roles.length > 0 ? (
              roles.map((role) => (
                <div
                  key={role.id}
                  className="bg-[#0E1A3A] border border-[#1E2A45] rounded px-3 py-2"
                >
                  {role.name}
                </div>
              ))
            ) : (
              <div className="text-gray-400">Роли не привязаны</div>
            )}

            <AssignRolesToPolicyModal
              open={assignOpen}
              onClose={() => setAssignOpen(false)}
              policyId={policy.id}
              policyName={policy.name}
              assignedRoles={roles}
              onChanged={async () => {
                // ✅ без reload: просто просим родителя обновить данные
                await onRefreshPolicy?.(policy.id);
              }}
            />
          </div>
        )}

        {tab === "history" && (
          <>
            {loading ? (
              <div className="text-gray-400 text-sm">Загрузка…</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-gray-400 text-sm">Нет записей аудита</div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-[#0E1A3A] border border-[#1E2A45] rounded p-3"
                  >
                    <div className="text-sm">
                      {formatPolicyHistoryAction(log.action, log.details)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {log.timestamp}
                      {log.user ? ` · ${log.user}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* =========================
   UI helpers
========================= */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm border transition
        ${
          active
            ? "bg-[#0E1A3A] border-[#3BE3FD] text-white"
            : "bg-[#121A33] border-[#1E2A45] text-gray-400 hover:text-white"
        }`}
    >
      {children}
    </button>
  );
}

function Param({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  );
}
