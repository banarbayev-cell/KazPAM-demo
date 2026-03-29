import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface EditPolicyPayload {
  name: string;
  type: string;
  status: string;
  mfa_required: boolean;
  time_start: string;
  time_end: string;
  ip_range: string;
  session_limit: number | null;
  allowed_systems: string[];
}

interface EditPolicyModalProps {
  open: boolean;
  policy: {
    id: number;
    name: string;
    type: string;
    status: string;
    mfa_required?: boolean;
    time_start?: string;
    time_end?: string;
    ip_range?: string;
    session_limit?: number | null;
    allowed_systems?: string[];
  } | null;
  onClose: () => void;
  onSave: (id: number, payload: EditPolicyPayload) => void | Promise<void>;
}

function parseAllowedSystems(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function EditPolicyModal({
  open,
  policy,
  onClose,
  onSave,
}: EditPolicyModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("active");

  const [mfaRequired, setMfaRequired] = useState(false);
  const [timeStart, setTimeStart] = useState("00:00");
  const [timeEnd, setTimeEnd] = useState("23:59");
  const [ipRange, setIpRange] = useState("0.0.0.0/0");
  const [sessionLimit, setSessionLimit] = useState("60");
  const [allowedSystems, setAllowedSystems] = useState("");

  useEffect(() => {
    if (open && policy) {
      setName(policy.name);
      setType(policy.type);
      setStatus(policy.status);

      setMfaRequired(Boolean(policy.mfa_required));
      setTimeStart(policy.time_start ?? "00:00");
      setTimeEnd(policy.time_end ?? "23:59");
      setIpRange(policy.ip_range ?? "0.0.0.0/0");
      setSessionLimit(
        policy.session_limit === null || policy.session_limit === undefined
          ? ""
          : String(policy.session_limit)
      );
      setAllowedSystems(
        Array.isArray(policy.allowed_systems)
          ? policy.allowed_systems.join(", ")
          : ""
      );
    }
  }, [open, policy]);

  if (!open || !policy) return null;

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedType = type.trim();

    if (!trimmedName || !trimmedType) return;

    onSave(policy.id, {
      name: trimmedName,
      type: trimmedType,
      status,
      mfa_required: mfaRequired,
      time_start: timeStart,
      time_end: timeEnd,
      ip_range: ipRange.trim() || "0.0.0.0/0",
      session_limit: sessionLimit.trim() === "" ? null : Number(sessionLimit),
      allowed_systems: parseAllowedSystems(allowedSystems),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999]">
      <div className="bg-[#0A0F24] text-white border border-gray-700 p-6 rounded-2xl shadow-xl w-[520px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Редактировать политику</h2>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300">Название</label>
          <Input
            className="mt-1 bg-[#1A243F] border border-gray-600 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300">Тип</label>
          <Input
            className="mt-1 bg-[#1A243F] border border-gray-600 text-white"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300">Статус</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#1A243F] text-white border border-gray-600 p-2 rounded w-full outline-none"
          >
            <option value="active">Активна</option>
            <option value="disabled">Отключена</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <input
              type="checkbox"
              checked={mfaRequired}
              onChange={(e) => setMfaRequired(e.target.checked)}
            />
            MFA требуется
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-300">
              Начало окна доступа
            </label>
            <Input
              className="mt-1 bg-[#1A243F] border border-gray-600 text-white"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              placeholder="00:00"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300">
              Конец окна доступа
            </label>
            <Input
              className="mt-1 bg-[#1A243F] border border-gray-600 text-white"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              placeholder="23:59"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300">
            Разрешённый диапазон IP
          </label>
          <Input
            className="mt-1 bg-[#1A243F] border border-gray-600 text-white"
            value={ipRange}
            onChange={(e) => setIpRange(e.target.value)}
            placeholder="0.0.0.0/0"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300">
            Лимит активных сессий
          </label>
          <Input
            className="mt-1 bg-[#1A243F] border border-gray-600 text-white"
            value={sessionLimit}
            onChange={(e) => setSessionLimit(e.target.value)}
            placeholder="Оставь пустым для снятия лимита"
            type="number"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300">
            Разрешённые системы
          </label>
          <Input
            className="mt-1 bg-[#1A243F] border border-gray-600 text-white"
            value={allowedSystems}
            onChange={(e) => setAllowedSystems(e.target.value)}
            placeholder="ad-01, ad-02, linux-prod-02"
          />
          <div className="text-xs text-gray-400 mt-1">
            Через запятую. Оставь пустым, чтобы разрешить все системы.
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
            onClick={onClose}
          >
            Отмена
          </Button>

          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-700"
            onClick={handleSave}
          >
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}