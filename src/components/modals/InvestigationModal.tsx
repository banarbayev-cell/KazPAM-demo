import { X, Ban, ShieldAlert, FileSpreadsheet, PlugZap } from "lucide-react";
import CommandActivityChart from "../charts/CommandActivityChart";

interface InvestigationModalProps {
  open: boolean;
  onClose: () => void;
  record: {
    user: string;
    ip: string;
    location: string;
    device: string;
    events: string[];
  };
  onBlock: () => void;
  onIsolate: () => void;
  onExport: () => void;
}

export default function InvestigationModal({
  open,
  onClose,
  record,
  onBlock,
  onIsolate,
  onExport,
}: InvestigationModalProps) {

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#121A33] rounded-2xl w-full max-w-3xl p-6 shadow-2xl border border-[var(--border)] animate-fadeIn">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold text-red-400 flex items-center gap-2">
            <ShieldAlert size={26} /> Угроза безопасности
          </h2>

          <button onClick={onClose} className="hover:text-red-400 transition">
            <X size={28} />
          </button>
        </div>

        {/* INFO */}
        <div className="space-y-1 text-[var(--text-secondary)] text-sm mb-4">
          <p><strong className="text-white">Пользователь:</strong> {record.user}</p>
          <p><strong className="text-white">IP:</strong> {record.ip}</p>
          <p><strong className="text-white">Локация:</strong> {record.location}</p>
          <p><strong className="text-white">Устройство:</strong> {record.device}</p>
        </div>

        {/* EVENTS */}
        <div className="bg-[#0E1A3A] border border-[var(--border)] p-4 rounded-lg mb-5">
          <h3 className="text-lg font-semibold text-white mb-2">Таймлайн событий</h3>
          <ul className="space-y-1 text-sm">
            {record.events.map((item, idx) => (
              <li key={idx} className="text-[var(--text-secondary)]">• {item}</li>
            ))}
          </ul>
        </div>

        {/* ACTIVITY GRAPH */}
        <div className="bg-[#0E1A3A] border border-[var(--border)] p-4 rounded-lg mb-5">
          <h3 className="text-lg font-semibold text-white mb-3">Активность команд (5 минут)</h3>
          <CommandActivityChart />
        </div>

        {/* AI RECOMMENDATION */}
        <div className="bg-[#1B233A] border border-[var(--border)] p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-[var(--neon)] mb-2">AI-анализ</h3>
          <p className="text-[var(--text-secondary)]">
            Зафиксировано <b className="text-white">рост активности на 360%</b>.
            Высокая вероятность компрометации учетной записи.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-between gap-4 pointer-events-auto">
          <button
            onClick={onIsolate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition font-semibold"
          >
            <PlugZap size={18} />
            Изолировать сессию
          </button>

          <button
            onClick={onBlock}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg transition font-semibold"
          >
            <Ban size={18} />
            Заблокировать пользователя
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-lg transition font-semibold"
          >
            <FileSpreadsheet size={18} />
            Экспорт
          </button>
        </div>
      </div>
    </div>
  );
}
