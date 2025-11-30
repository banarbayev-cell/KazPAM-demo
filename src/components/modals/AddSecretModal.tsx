import React from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddSecretModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-[480px] rounded-xl shadow-2xl p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          Добавить секрет
        </h2>

        <div className="flex flex-col gap-3">
          <select className="border p-2 rounded-lg">
            <option>Тип секрета</option>
            <option>Пароль</option>
            <option>SSH ключ</option>
            <option>API Token</option>
            <option>Access Key</option>
            <option>Kubeconfig</option>
            <option>Сертификат</option>
          </select>

          <input className="border p-2 rounded-lg" placeholder="Система (пример: Windows Server)" />
          <input className="border p-2 rounded-lg" placeholder="Логин" />
          <input className="border p-2 rounded-lg" placeholder="Пароль / ключ / токен" />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
            onClick={onClose}
          >
            Отмена
          </button>

          <button className="px-4 py-2 rounded bg-[#0052FF] text-white hover:bg-blue-700">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
