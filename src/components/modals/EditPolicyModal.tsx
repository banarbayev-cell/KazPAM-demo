import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface EditPolicyModalProps {
  open: boolean;
  policy: {
    id: number;
    name: string;
    type: string;
    status: string;
  } | null;
  onClose: () => void;
  onSave: (id: number, name: string, type: string, status: string) => void;
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

  // Загружаем данные политики при открытии
  useEffect(() => {
    if (open && policy) {
      setName(policy.name);
      setType(policy.type);
      setStatus(policy.status);
    }
  }, [open, policy]);

  if (!open || !policy) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999]">

      <div className="bg-[#0A0F24] text-white border border-gray-700 p-6 rounded-2xl shadow-xl w-[420px]">

        <h2 className="text-xl font-bold mb-4">Редактировать политику</h2>

        {/* Название */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300">Название</label>
          <Input
            className="mt-1 bg-[#1A243F] border border-gray-600 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Тип */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300">Тип</label>
          <Input
            className="mt-1 bg-[#1A243F] border border-gray-600 text-white"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>

        {/* Статус */}
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

        {/* Кнопки */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
            onClick={onClose}
          >
            Отмена
          </Button>

          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-700"
            onClick={() => onSave(policy.id, name, type, status)}
          >
            Сохранить
          </Button>
        </div>

      </div>
    </div>
  );
}
