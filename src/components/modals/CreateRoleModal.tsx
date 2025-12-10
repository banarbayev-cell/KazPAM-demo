import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export default function CreateRoleModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#121A33] text-white rounded-xl p-6 shadow-2xl w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Создать роль</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <Input
            placeholder="Название роли"
            className="bg-white text-gray-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            className="border-gray-500 text-gray-300"
            onClick={onClose}
          >
            Отмена
          </Button>

          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              if (!name.trim()) return;
              onCreate(name);
              setName("");
              onClose();
            }}
          >
            Создать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
