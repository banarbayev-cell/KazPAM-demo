import { X } from "lucide-react";

export default function PolicyDetailsPanel({ open, onClose, policy, auditLogs }: any) {
  if (!open || !policy) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-[99999] p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Политика: {policy.name}</h2>
        <X className="cursor-pointer" onClick={onClose} />
      </div>

      <p className="text-gray-700 mb-4">
        Тип: <span className="font-bold">{policy.type}</span>
      </p>
      <p className="text-gray-700 mb-4">
        Статус:{" "}
        <span className={`font-bold ${policy.status === "active" ? "text-green-600" : "text-red-600"}`}>
          {policy.status === "active" ? "Активна" : "Отключена"}
        </span>
      </p>
      <p className="text-gray-700 mb-6">
        Обновлена: <span className="font-bold">{policy.updated_at}</span>
      </p>

      <h3 className="text-xl font-bold mt-4 mb-2">История изменений</h3>

      {auditLogs.length === 0 ? (
        <p className="text-gray-500">Нет записей аудита.</p>
      ) : (
        <div className="space-y-3">
          {auditLogs.map((log: any) => (
            <div key={log.id} className="p-3 border rounded-lg bg-gray-50">
              <p className="text-sm text-gray-700">{log.action}</p>
              <p className="text-xs text-gray-500">{log.timestamp}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
