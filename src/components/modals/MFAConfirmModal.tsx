import React, { useState } from "react";

interface MFAConfirmProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MFAConfirmModal({ open, onClose, onSuccess }: MFAConfirmProps) {
  const [code, setCode] = useState("");

  if (!open) return null;

  const handleVerify = () => {
    if (code === "123456") {
      onSuccess();
      onClose();
    } else {
      alert("❌ Неверный код");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl w-[420px] p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Подтверждение личности</h2>
        <p className="text-gray-600 mb-5">
          Введите одноразовый код подтверждения для просмотра секрета.
        </p>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Введите код"
          className="w-full border border-gray-300 rounded-lg p-3 mb-5 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
          >
            Отмена
          </button>

          <button
            onClick={handleVerify}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}
