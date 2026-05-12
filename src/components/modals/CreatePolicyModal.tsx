import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { X } from "lucide-react";

interface CreatePolicyPayload {
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

interface CreatePolicyModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreatePolicyPayload) => void | Promise<void>;
}

function parseAllowedSystems(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const POLICY_TYPE_OPTIONS = [
  {
    value: "Access Policy",
    label: "Access Policy",
    hint: "Категория для ограничений доступа к системам, IP, времени и MFA.",
  },
  {
    value: "Session Policy",
    label: "Session Policy",
    hint: "Категория для правил запуска PAM-сессий и лимитов.",
  },
  {
    value: "MFA Policy",
    label: "MFA Policy",
    hint: "Категория для правил обязательной многофакторной аутентификации.",
  },
  {
    value: "PAM Policy",
    label: "PAM Policy",
    hint: "Общая PAM-политика. Используйте, если правило комбинированное.",
  },
  {
    value: "Security Policy",
    label: "Security Policy",
    hint: "Общая политика безопасности для контроля доступа.",
  },
];

export default function CreatePolicyModal({
  open,
  onClose,
  onCreate,
}: CreatePolicyModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Access Policy");

  const [mfaRequired, setMfaRequired] = useState(false);
  const [timeStart, setTimeStart] = useState("00:00");
  const [timeEnd, setTimeEnd] = useState("23:59");
  const [ipRange, setIpRange] = useState("0.0.0.0/0");
  const [sessionLimit, setSessionLimit] = useState("60");
  const [allowedSystems, setAllowedSystems] = useState("");

  if (!open) return null;

  const resetForm = () => {
    setName("");
    setType("Access Policy");
    setMfaRequired(false);
    setTimeStart("00:00");
    setTimeEnd("23:59");
    setIpRange("0.0.0.0/0");
    setSessionLimit("60");
    setAllowedSystems("");
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    await onCreate({
      name: trimmedName,
      type,
      status: "active",
      mfa_required: mfaRequired,
      time_start: timeStart,
      time_end: timeEnd,
      ip_range: ipRange.trim() || "0.0.0.0/0",
      session_limit: sessionLimit.trim() === "" ? null : Number(sessionLimit),
      allowed_systems: parseAllowedSystems(allowedSystems),
    });

    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999]">
      <div className="bg-[#0A0F24] border border-gray-700 text-white rounded-2xl p-6 w-[520px] max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-4">Создание новой политики</h2>

        <div className="flex flex-col gap-4">
          <Input
            placeholder="Название политики"
            className="bg-[#1A243F] text-white border border-gray-600"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="text-sm text-gray-300">
              Категория политики
            </label>

            <select
              className="mt-1 bg-[#1A243F] text-white border border-gray-600 p-2 rounded-lg outline-none w-full"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {POLICY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="text-xs text-gray-400 mt-1 leading-5">
              Категория нужна для классификации политики в интерфейсе. Набор параметров
               ниже единый: MFA, время доступа, IP, лимит сессий и разрешённые системы.
            </div>

            <div className="text-xs text-[#3BE3FD] mt-1">
              {POLICY_TYPE_OPTIONS.find((item) => item.value === type)?.hint}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={mfaRequired}
              onChange={(e) => setMfaRequired(e.target.checked)}
            />
            MFA требуется
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-300">
                Начало окна доступа
              </label>
              <Input
                className="mt-1 bg-[#1A243F] text-white border border-gray-600"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                placeholder="00:00"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300">
                Конец окна доступа
              </label>
              <Input
                className="mt-1 bg-[#1A243F] text-white border border-gray-600"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                placeholder="23:59"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Разрешённый диапазон IP
            </label>
            <Input
              className="mt-1 bg-[#1A243F] text-white border border-gray-600"
              value={ipRange}
              onChange={(e) => setIpRange(e.target.value)}
              placeholder="0.0.0.0/0"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Лимит активных сессий
            </label>
            <Input
              className="mt-1 bg-[#1A243F] text-white border border-gray-600"
              value={sessionLimit}
              onChange={(e) => setSessionLimit(e.target.value)}
              type="number"
              placeholder="60"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Разрешённые системы
            </label>
            <Input
              className="mt-1 bg-[#1A243F] text-white border border-gray-600"
              value={allowedSystems}
              onChange={(e) => setAllowedSystems(e.target.value)}
              placeholder="server-01, linux-prod-01, ad-01"
            />
              <div className="text-xs text-gray-400 mt-1 leading-5">
                Через запятую. Если оставить пустым — политика разрешает все системы.
                Значение проверяется Policy Engine при запуске PAM-сессии.
              </div>
            </div>

          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold"
            onClick={handleSubmit}
          >
            Создать
          </Button>
        </div>
      </div>
    </div>
  );
}