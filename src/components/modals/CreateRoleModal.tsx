import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  loading?: boolean;
}

export default function CreateRoleModal({
  isOpen,
  onClose,
  onCreate,
  loading,
}: CreateRoleModalProps) {
  const [name, setName] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-[#0A0F24] w-[420px] p-6 rounded-xl border border-white/10">

        <h2 className="text-2xl font-bold mb-4 text-white">
          Создать роль
        </h2>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название роли"
          className="mb-6 bg-[#121A33] border border-[#1E2A45] text-white placeholder:text-gray-400"
        />

        <div className="flex justify-end gap-3">
          <Button
            onClick={onClose}
            className="bg-[#1E2A45] text-white hover:bg-[#2A3A5F]"
          >
            Отмена
          </Button>

          <Button
            disabled={!name.trim() || loading}
            onClick={() => onCreate(name.trim())}
            className="bg-[#0052FF] text-white hover:bg-[#1A6BFF]"
          >
            Создать
          </Button>
        </div>
      </div>
    </div>
  );
}
