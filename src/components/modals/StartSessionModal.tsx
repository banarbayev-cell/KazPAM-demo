import { useEffect, useMemo, useState } from "react";
import { startSession } from "@/api/sessions";
import { listAccessibleTargets } from "@/api/targets";
import type { Target } from "@/types/targets";
import { useAuth } from "@/store/auth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function extractErrorMessage(error: any): string {
  return (
    error?.response?.data?.detail ||
    error?.message ||
    "Не удалось запустить сессию"
  );
}

export default function StartSessionModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const authUser = useAuth((s) => s.user);

  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetsLoading, setTargetsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadTargets = async () => {
      setTargetsLoading(true);
      setError(null);
      setSelectedTargetId("");

      try {
        const accessible = await listAccessibleTargets("ssh");

        const sshTargets = Array.isArray(accessible)
          ? accessible.filter(
              (t) =>
                String(t.protocol || "").toLowerCase() === "ssh" &&
                t.is_active !== false
            )
          : [];

        setTargets(sshTargets);
      } catch (e: any) {
        setTargets([]);
        setError(extractErrorMessage(e));
      } finally {
        setTargetsLoading(false);
      }
    };

    loadTargets();
  }, [isOpen]);

  const selectedTarget = useMemo(() => {
    const id = Number(selectedTargetId);
    if (!Number.isFinite(id)) return null;
    return targets.find((t) => t.id === id) || null;
  }, [targets, selectedTargetId]);

  if (!isOpen) return null;

  const submit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!selectedTarget) {
        throw new Error("Выберите целевую систему");
      }

      const targetUsername = selectedTarget.username?.trim();
      if (!targetUsername) {
        throw new Error("Для выбранной системы не задана учётная запись");
      }

      await startSession({
        user: targetUsername,
        target_id: selectedTarget.id,
        app: "SSH",
        mfa_passed: false,
      });

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#121A33] text-white p-6 rounded-xl w-[560px] max-w-[95vw] space-y-4 border border-[#1E2A45] shadow-2xl">
        <h2 className="text-lg font-semibold">Запуск сессии</h2>

        <div className="space-y-1">
          <div className="text-sm text-gray-400">Инициатор</div>
          <div className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-sm">
            {authUser?.email || "—"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm text-gray-400">Целевая система</div>
          <select
            className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            disabled={targetsLoading || loading}
          >
            <option value="">
              {targetsLoading
                ? "Загрузка систем..."
                : targets.length === 0
                ? "Нет доступных SSH-систем"
                : "Выберите систему"}
            </option>

            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name} — {target.host}:{target.port}
              </option>
            ))}
          </select>
        </div>

        {selectedTarget && (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-gray-400">Host / IP</div>
                <div className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45]">
                  {selectedTarget.host}:{selectedTarget.port}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-gray-400">OS</div>
                <div className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45]">
                  {selectedTarget.os_type || "—"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-gray-400">Protocol</div>
                <div className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] uppercase">
                  {selectedTarget.protocol || "—"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-gray-400">Учётная запись</div>
                <div className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45]">
                  {selectedTarget.username || "—"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedTarget.requires_vault_secret && (
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Vault required
                </span>
              )}

              {selectedTarget.approval_required && (
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Approval required
                </span>
              )}

              {selectedTarget.break_glass_enabled && (
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                  Break-glass {selectedTarget.break_glass_ttl_minutes}m
                </span>
              )}

              {selectedTarget.ssh_auth_mode && (
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30">
                  SSH {selectedTarget.ssh_auth_mode}
                </span>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-3 py-2 text-gray-300 hover:text-white transition"
          >
            Отмена
          </button>

          <button
            onClick={submit}
            disabled={loading || !selectedTarget}
            className="px-4 py-2 bg-[#0052FF] rounded disabled:bg-gray-600 text-white"
          >
            {loading ? "Запуск..." : "Запустить"}
          </button>
        </div>
      </div>
    </div>
  );
}