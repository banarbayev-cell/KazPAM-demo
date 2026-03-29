import { useState } from "react";
import { X } from "lucide-react";
import ConfirmTerminateSessionModal from "./modals/ConfirmTerminateSessionModal";

type SessionStatus = "active" | "closed" | "failed" | "terminated" | string;

interface SessionDetail {
  id: number;
  user: string;
  system: string;
  ip: string;
  status: SessionStatus;
  os?: string;
  app?: string;
  conn?: string;
  risk?: string;
  last_command?: string;
  duration?: string;
  date?: string;
}

interface SessionDetailPanelProps {
  open: boolean;
  onClose: () => void;
  session: SessionDetail | null;
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
}: SessionDetailPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!open || !session) return null;

  return (
    <div className="fixed inset-0 z-[1000]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="absolute right-0 top-0 h-full w-[420px] bg-[#121A33] text-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Детали сессии</h2>
          <button onClick={onClose} type="button">
            <X />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <Row label="Пользователь" value={session.user} />
          <Row label="Система" value={session.system} />
          <Row label="IP" value={session.ip} />
          <Row label="Статус" value={session.status} />
        </div>

        {session.status === "failed" && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded">
            Доступ запрещён политикой
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            className="w-full bg-red-600 py-2 rounded"
            onClick={() => setConfirmOpen(true)}
          >
            Завершить сессию
          </button>

          <button
            type="button"
            className="w-full bg-[#1A243F] py-2 rounded"
            onClick={() => onAudit?.()}
          >
            Перейти в Audit
          </button>
        </div>

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

function Row({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400">{label}</span>
      <span>{value ?? "—"}</span>
    </div>
  );
}