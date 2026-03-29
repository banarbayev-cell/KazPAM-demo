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
  session_limit: number;
}

interface CreatePolicyModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreatePolicyPayload) => void | Promise<void>;
}

export default function CreatePolicyModal({
  open,
  onClose,
  onCreate,
}: CreatePolicyModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("PAM Policy");

  const [mfaRequired, setMfaRequired] = useState(false);
  const [timeStart, setTimeStart] = useState("00:00");
  const [timeEnd, setTimeEnd] = useState("23:59");
  const [ipRange, setIpRange] = useState("0.0.0.0/0");
  const [sessionLimit, setSessionLimit] = useState("60");

  if (!open) return null;

  const resetForm = () => {
    setName("");
    setType("PAM Policy");
    setMfaRequired(false);
    setTimeStart("00:00");
    setTimeEnd("23:59");
    setIpRange("0.0.0.0/0");
    setSessionLimit("60");
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
      session_limit: Number(sessionLimit) || 60,
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

          <select
            className="bg-[#1A243F] text-white border border-gray-600 p-2 rounded-lg outline-none"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option>PAM Policy</option>
            <option>Session Policy</option>
            <option>Security Policy</option>
            <option>Access Policy</option>
            <option value="Password Policy">Password/Secret Policy</option>
            <option value="MFA Policy">MFA Policy</option>
            <option value="Workflow Policy">Workflow Policy</option>
            <option value="Risk Policy">Risk Policy</option>
          </select>

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