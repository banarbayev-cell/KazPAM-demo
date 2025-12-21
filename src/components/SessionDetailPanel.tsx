import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import ConfirmTerminateSessionModal from "./modals/ConfirmTerminateSessionModal";

interface Props {
  open: boolean;
  onClose: () => void;
  session: any | null;

  onTerminate?: () => void;
  onAudit?: () => void;
  onDownloadLogs?: () => void;
}

export default function SessionDetailPanel({
  open,
  onClose,
  session,
  onTerminate,
  onAudit,
  onDownloadLogs,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!open || !session) return null;

  const canTerminate = session.status === "active";

  return (
    <div
      className="fixed inset-0 z-[1000]"
      onClick={onClose}
    >
      {/* BACKDROP */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* PANEL */}
      <div
        className="absolute right-0 top-0 h-full w-[420px]
                   bg-[#121A33] text-white p-6 overflow-y-auto
                   pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Детали сессии</h2>
          <button type="button" onClick={onClose}>
            <X className="text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Details */}
        <div className="space-y-3 text-sm">
          <Row label="Пользователь" value={session.user} />
          <Row label="Система" value={session.system} />
          <Row label="Тип системы" value={session.os} />
          <Row label="Метод доступа" value={session.conn} />
          <Row label="Приложение / БД" value={session.app} />
          <Row label="IP-адрес" value={session.ip} />
          <Row label="Начало" value={session.date || "—"} />
          <Row label="Длительность" value={session.duration || "—"} />
          <Row label="Последняя команда" value={session.last_command || "—"} />
          <Row label="Риск" value={session.risk} />
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          {/* TERMINATE (через confirm) */}
          <button
            type="button"
            onClick={() => {
              if (!canTerminate) {
                toast.info("Сессия уже завершена");
                return;
              }
              setConfirmOpen(true);
            }}
            className="w-full py-2 rounded-md bg-red-600 hover:bg-red-700"
          >
            Принудительно завершить сессию
          </button>

          {/* AUDIT */}
          <button
            type="button"
            onClick={() => onAudit?.()}
            className="w-full py-2 rounded-md bg-[#1A243F] hover:bg-[#0E1A3A]"
          >
            Начать расследование
          </button>

          {/* DOWNLOAD */}
          <button
            type="button"
            onClick={() => {
              if (onDownloadLogs) onDownloadLogs();
              else toast.info("Экспорт логов будет добавлен позже");
            }}
            className="w-full py-2 rounded-md bg-[#1A243F] hover:bg-[#0E1A3A]"
          >
            Экспорт логов сессии
          </button>
        </div>

        {/* CONFIRM MODAL */}
        <ConfirmTerminateSessionModal
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            onTerminate?.();
          }}
          session={{
            user: session.user,
            system: session.system,
            ip: session.ip,
          }}
        />
      </div>
    </div>
  );
}

/* ===============================
   SMALL ROW
================================ */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
