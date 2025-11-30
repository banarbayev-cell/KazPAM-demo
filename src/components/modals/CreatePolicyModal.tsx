import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (policy: any) => void;
}

export default function CreatePolicyModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Access control");

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate({
      name,
      type,
      status: "active",
      updated_at: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] animate-fadeIn">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-[430px] relative text-black">
        {/* CLOSE BUTTON */}
        <button className="absolute top-3 right-3" onClick={onClose}>
          <X size={22} className="text-gray-600 hover:text-black" />
        </button>

        <h2 className="text-xl font-bold mb-4">Создать политику</h2>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Название политики"
            className="border border-gray-400 rounded-lg px-3 py-2 focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="border border-gray-400 rounded-lg px-3 py-2 focus:outline-none"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option>Access control</option>
            <option>MFA</option>
            <option>Session control</option>
            <option>Recording</option>
            <option>Alerts</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
          >
            Отмена
          </button>

          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
