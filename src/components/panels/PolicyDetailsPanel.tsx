import { X } from "lucide-react";

interface PolicyDetailsPanelProps {
  open: boolean;
  onClose: () => void;
  policy: {
    id: number;
    name: string;
    type: string;
    status: string;
    updated_at: string;
  } | null;
}

export default function PolicyDetailsPanel({
  open,
  onClose,
  policy,
}: PolicyDetailsPanelProps) {
  if (!open || !policy) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[9998] flex justify-end">
      <div className="w-[420px] h-full bg-white p-6 shadow-xl">
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Детали политики</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Название:</p>
            <p className="font-semibold">{policy.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Тип политики:</p>
            <p className="font-semibold">{policy.type}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Статус:</p>
            <p
              className={
                policy.status === "active"
                  ? "text-green-600 font-semibold"
                  : "text-red-600 font-semibold"
              }
            >
              {policy.status === "active" ? "Активна" : "Отключена"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Последнее изменение:</p>
            <p className="font-semibold">{policy.updated_at}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
