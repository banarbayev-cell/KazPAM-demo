import { X } from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (user: any) => void;
}

export default function CreateUserModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Оператор");
  const [password, setPassword] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim() || !password.trim()) return;
    onCreate({ name, role, status: "active" });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-[420px] p-6 relative text-black">

        <button className="absolute top-3 right-3" onClick={onClose}>
          <X className="text-gray-600 hover:text-black" />
        </button>

        <h2 className="text-xl font-bold mb-4">Создать пользователя</h2>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Имя пользователя"
            className="border border-gray-400 rounded-lg px-3 py-2 focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="border border-gray-400 rounded-lg px-3 py-2 focus:outline-none"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option>Администратор</option>
            <option>Офицер безопасности</option>
            <option>Оператор</option>
            <option>Суперпользователь</option>
          </select>

          <input
            type="password"
            placeholder="Пароль"
            className="border border-gray-400 rounded-lg px-3 py-2 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex justify-end mt-5 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
          >
            Отмена
          </button>

          <button onClick={handleSubmit} className="k-btn-primary">
            Создать
          </button>
        </div>

      </div>
    </div>
  );
}
