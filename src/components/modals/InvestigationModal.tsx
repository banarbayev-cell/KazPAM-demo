import { X, Ban, FileSpreadsheet, ShieldAlert } from "lucide-react";
import CommandActivityChart from "../charts/CommandActivityChart";

interface InvestigationModalProps {
  open: boolean;
  onClose: () => void;
  ip: string;
  location: string;
  device: string;
  events: string[];
  onBlockUser: () => void;
  onExport: () => void;
}

export default function InvestigationModal({
  open,
  onClose,
  ip,
  location,
  device,
  events,
  onBlockUser,
  onExport
}: InvestigationModalProps) {

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-[#121A33] border border-[var(--border)] rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-fadeIn">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-red-400 flex items-center gap-2">
            <ShieldAlert size={26} />
            Уровень угрозы: Критический
          </h2>

          <button onClick={onClose} className="hover:text-red-400 transition">
            <X size={26} />
          </button>
        </div>

        {/* INFO BLOCK */}
        <div className="space-y-1 text-[var(--text-secondary)] text-sm mb-6">
          <p><strong className="text-white">IP-адрес:</strong> {ip}</p>
          <p><strong className="text-white">Локация:</strong> {location}</p>
          <p><strong className="text-white">Устройство:</strong> {device}</p>
        </div>

        {/* EVENTS TIMELINE */}
        <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Таймлайн событий</h3>
          <ul className="space-y-1 text-sm">
            {events.map((event, index) => (
              <li key={index} className="text-[var(--text-secondary)]">
                • {event}
              </li>
            ))}
          </ul>
        </div>

        {/* ACTIVITY GRAPH */}
        <div className="bg-[#0E1A3A] border border-[var(--border)] rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Активность команд (последние 5 минут)
          </h3>
          <CommandActivityChart />
        </div>

        {/* AI RECOMMENDATION */}
        <div className="bg-[#1B233A] border border-[var(--border)] rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-[var(--neon)] mb-2">AI-анализ</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            Активность команд увеличилась на <b className="text-white">360%</b> за 5 минут.
            Вероятная компрометация пользователя <b className="text-white">root</b>.
            Рекомендуем выполнить изоляцию сессии.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-between gap-4">
          <button
            onClick={onBlockUser}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <Ban size={18} />
            Заблокировать пользователя
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg font-semibold transition"
          >
            <FileSpreadsheet size={18} />
            Экспорт в Excel
          </button>
        </div>

      </div>
    </div>
  );
}
