import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { X } from "lucide-react";

interface CreatePolicyModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, type: string) => void;
}

export default function CreatePolicyModal({ open, onClose, onCreate }: CreatePolicyModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("PAM Policy");

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate(name, type);
    setName("");
    setType("PAM Policy");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999]">

      <div className="bg-[#0A0F24] border border-gray-700 text-white rounded-2xl p-6 w-[420px] shadow-2xl relative">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-4">Создание новой политики</h2>

        <div className="flex flex-col gap-4">
          
          {/* Поле Название */}
          <Input
            placeholder="Название политики"
            className="bg-[#1A243F] text-white border border-gray-600"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Поле Тип политики */}
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

          {/* Кнопка создания */}
          <Button
            className="
              bg-blue-600 
              hover:bg-blue-700 
              text-white 
              py-2 
              rounded-lg
              font-semibold
            "
            onClick={handleSubmit}
          >
            Создать
          </Button>
        </div>
      </div>
    </div>
  );
}
