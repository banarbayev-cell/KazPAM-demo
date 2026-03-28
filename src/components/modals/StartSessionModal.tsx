import { useEffect, useMemo, useState } from "react";
import { startSession } from "@/api/sessions";
import {
  listAccessibleTargets,
  listTargets,
} from "@/api/targets";
import type { Target } from "@/types/targets";
import { useAuth } from "@/store/auth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StartSessionModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const authUser = useAuth((s) => s.user);

  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [manualMode, setManualMode] = useState(false);

  const [manualForm, setManualForm] = useState({
    user: "",
    system: "",
    os: "Linux",
    ip: "",
    app: "SSH",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetsLoading, setTargetsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setManualForm((prev) => ({
      ...prev,
      user: prev.user || authUser?.email || "",
    }));

    const loadTargets = async () => {
      setTargetsLoading(true);
      try {
        const accessible = await listAccessibleTargets("ssh");
        setTargets(Array.isArray(accessible) ? accessible : []);
      } catch {
        try {
          const all = await listTargets();
          setTargets(
            Array.isArray(all)
              ? all.filter(
                  (t) =>
                    String(t.protocol || "").toLowerCase() === "ssh" &&
                    t.is_active !== false
                )
              : []
          );
        } catch {
          setTargets([]);
        }
      } finally {
        setTargetsLoading(false);
      }
    };

    loadTargets();
  }, [isOpen, authUser?.email]);

  const sshTargets = useMemo(() => {
    return targets.filter(
      (t) =>
        String(t.protocol || "").toLowerCase() === "ssh" &&
        t.is_active !== false
    );
  }, [targets]);

  const selectedTarget = useMemo(() => {
    const id = Number(selectedTargetId);
    if (!Number.isFinite(id)) return null;
    return sshTargets.find((t) => t.id === id) || null;
  }, [sshTargets, selectedTargetId]);

  if (!isOpen) return null;

  const submit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!manualMode) {
        if (!selectedTarget) {
          throw new Error("Выберите целевую систему");
        }

        await startSession({
          user:
            selectedTarget.username?.trim() ||
            authUser?.email ||
            "unknown",
          target_id: selectedTarget.id,
          app: "SSH",
          mfa_passed: false,
        });
      } else {
        await startSession({
          ...manualForm,
          mfa_passed: false,
        });
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          e?.message ||
          "Не удалось запустить сессию"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#121A33] text-white p-6 rounded-xl w-[520px] space-y-4">
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
            className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45]"
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            disabled={targetsLoading}
          >
            <option value="">
              {targetsLoading ? "Загрузка систем..." : "Выберите систему"}
            </option>
            {sshTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name} — {target.host}:{target.port}
              </option>
            ))}
          </select>
        </div>

        {selectedTarget && (
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
                {selectedTarget.username || "Будет определена backend"}
              </div>
            </div>
          </div>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setManualMode((prev) => !prev)}
            className="text-xs text-gray-400 underline"
          >
            {manualMode
              ? "Скрыть ручной режим"
              : "Ручной режим (admin fallback)"}
          </button>
        </div>

        {manualMode && (
          <div className="space-y-3 border-t border-[#1E2A45] pt-4">
            <input
              placeholder="Пользователь (email / login)"
              className="w-full p-2 rounded bg-[#0E1A3A]"
              value={manualForm.user}
              onChange={(e) =>
                setManualForm({ ...manualForm, user: e.target.value })
              }
            />

            <input
              placeholder="Система"
              className="w-full p-2 rounded bg-[#0E1A3A]"
              value={manualForm.system}
              onChange={(e) =>
                setManualForm({ ...manualForm, system: e.target.value })
              }
            />

            <input
              placeholder="IP"
              className="w-full p-2 rounded bg-[#0E1A3A]"
              value={manualForm.ip}
              onChange={(e) =>
                setManualForm({ ...manualForm, ip: e.target.value })
              }
            />
          </div>
        )}

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-gray-300">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={loading || (!manualMode && !selectedTarget)}
            className="px-4 py-2 bg-[#0052FF] rounded disabled:bg-gray-600"
          >
            Запустить
          </button>
        </div>
      </div>
    </div>
  );
}