import { useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: {
    username: string;
    role: string;
    status: string;
  } | null;
};

export default function UserModal({ isOpen, onClose, user }: Props) {
  if (!isOpen || !user) return null;

  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white w-[450px] rounded-xl p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Редактировать пользователя</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium">Логин</label>
          <input type="text" value={user.username} disabled className="w-full border rounded-lg px-3 py-2 bg-gray-100"/>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">Роль</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option>Администратор</option>
            <option>Оператор</option>
            <option>Пользователь</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">Статус</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="active">Активен</option>
            <option value="blocked">Заблокирован</option>
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Отмена
          </button>

          <button
            onClick={() => {
              alert(`Изменения сохранены для пользователя ${user.username}`);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
