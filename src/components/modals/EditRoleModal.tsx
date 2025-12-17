import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface EditRoleModalProps {
  isOpen: boolean;
  roleName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export default function EditRoleModal({
  isOpen,
  roleName,
  onClose,
  onSave,
}: EditRoleModalProps) {
  const [name, setName] = useState(roleName);

  useEffect(() => {
    setName(roleName);
  }, [roleName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-[#0A0F24] w-[420px] p-6 rounded-xl border border-white/10">

        <h2 className="text-2xl font-bold mb-4 text-white">
          Редактировать роль
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
    disabled={!name.trim()}
    onClick={() => onSave(name.trim())}
    className="bg-[#0052FF] text-white hover:bg-[#1A6BFF]"
  >
    Сохранить
  </Button>
</div>

      </div>
    </div>
  );
}
