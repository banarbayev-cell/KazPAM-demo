import { useMemo, useState } from "react";
import { X, Copy } from "lucide-react";
import { toast } from "sonner";
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
  protocol?: string | null;

  target_id?: number | null;
  vault_secret_id?: number | null;
  gateway_node?: string | null;
  launch_mode?: string | null;
  pam_user?: string | null;
  details?: string | null;

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

function copyTextFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

async function copyText(text: string) {
  if (!text) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // fallback below
  }

  copyTextFallback(text);
}

function safeParseDetails(raw?: string | null): Record<string, any> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : { raw };
  } catch {
    return { raw };
  }
}

function normalizeProtocol(session: SessionDetail) {
  return String(session.protocol || session.app || session.conn || "")
    .trim()
    .toLowerCase();
}

function protocolLabel(protocol: string) {
  switch (protocol) {
    case "ssh":
      return "SSH";
    case "rdp":
      return "RDP";
    case "https":
      return "HTTPS";
    case "mssql":
      return "MS SQL";
    case "vnc":
      return "VNC";
    default:
      return protocol ? protocol.toUpperCase() : "—";
  }
}

function statusLabel(status: SessionStatus) {
  switch (status) {
    case "active":
      return "Активна";
    case "closed":
    case "terminated":
      return "Завершена";
    case "failed":
      return "Ошибка";
    default:
      return status || "—";
  }
}

function getNested(details: Record<string, any>, key: string) {
  if (details[key] !== undefined && details[key] !== null) {
    return details[key];
  }

  if (
    details.launch_payload &&
    typeof details.launch_payload === "object" &&
    details.launch_payload[key] !== undefined &&
    details.launch_payload[key] !== null
  ) {
    return details.launch_payload[key];
  }

  if (
    details.payload &&
    typeof details.payload === "object" &&
    details.payload[key] !== undefined &&
    details.payload[key] !== null
  ) {
    return details.payload[key];
  }

  return undefined;
}

export default function SessionDetailPanel({
  open,
  onClose,
  session,
  onTerminate,
  onAudit,
}: SessionDetailPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const details = useMemo(
    () => safeParseDetails(session?.details),
    [session?.details]
  );

  if (!open || !session) return null;

  const protocol = normalizeProtocol(session);

  const rdpSessionId =
    getNested(details, "rdp_session_id") ||
    getNested(details, "technical_session_id");

  const targetPort =
    getNested(details, "target_port") ||
    getNested(details, "port");

  const targetUser =
    getNested(details, "target_username") ||
    getNested(details, "target_user") ||
    getNested(details, "username") ||
    session.pam_user;

  const launchUrl =
    getNested(details, "launch_url") ||
    getNested(details, "url");

  const connectionString =
    getNested(details, "connection_string_stub") ||
    getNested(details, "connection_string");

  const launchHost =
    getNested(details, "launch_host") ||
    getNested(details, "proxy_host");

  const launchPort =
    getNested(details, "launch_port") ||
    getNested(details, "proxy_port");

  const hostPort =
    launchHost && launchPort
      ? `${launchHost}:${launchPort}`
      : targetPort
        ? `${session.ip}:${targetPort}`
        : "";

  const approvalRequired = getNested(details, "approval_required");
  const approvalGrantUsed = getNested(details, "approval_grant_used");
  const breakGlass = getNested(details, "break_glass");
  const breakGlassReason = getNested(details, "break_glass_reason");
  const source = getNested(details, "source");

  const canTerminate = session.status === "active";

  return (
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="absolute right-0 top-0 h-full w-[520px] max-w-[95vw] bg-[#121A33] text-white p-6 overflow-y-auto border-l border-[#1E2A45] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-xl font-bold">Детали сессии</h2>
            <p className="text-xs text-gray-400 mt-1">
              Common Session #{session.id} · {protocolLabel(protocol)}
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded hover:bg-[#1E2A45]"
          >
            <X />
          </button>
        </div>

        <Section title="Основная информация">
          <Row label="Common Session ID" value={`#${session.id}`} />
          <Row label="Пользователь" value={session.user} />
          <Row label="Система" value={session.system} />
          <Row label="IP / Host" value={session.ip} />
          <Row label="Порт" value={targetPort || "—"} />
          <Row label="Target user" value={targetUser || "—"} />
          <Row label="OS" value={session.os || "—"} />
          <Row label="Протокол" value={protocolLabel(protocol)} />
          <Row label="Статус" value={statusLabel(session.status)} />
          <Row label="Дата запуска" value={session.date || "—"} />
        </Section>

        <Section title="PAM / Target context">
          <Row label="Target ID" value={session.target_id ? `#${session.target_id}` : "—"} />
          <Row
            label="Vault Secret"
            value={session.vault_secret_id ? `Secret #${session.vault_secret_id}` : "Не привязан"}
          />
          <Row label="Launch mode" value={session.launch_mode || "—"} />
          <Row label="Gateway node" value={session.gateway_node || "—"} />
          <Row label="Source" value={source || "—"} />
          <Row
            label="Approval required"
            value={approvalRequired === undefined ? "—" : approvalRequired ? "Да" : "Нет"}
          />
          <Row
            label="Approval grant used"
            value={approvalGrantUsed === undefined ? "—" : approvalGrantUsed ? "Да" : "Нет"}
          />
          <Row
            label="Break-glass"
            value={breakGlass === undefined ? "—" : breakGlass ? "Да" : "Нет"}
          />
          {breakGlass && (
            <Row label="Break-glass reason" value={breakGlassReason || "—"} />
          )}
        </Section>

        {protocol === "rdp" && (
          <Section title="RDP access">
            <Row label="RDP Session ID" value={rdpSessionId ? `#${rdpSessionId}` : "—"} />
            <Row label="Target" value={targetPort ? `${session.ip}:${targetPort}` : session.ip} />
            <Row label="Username" value={targetUser || "—"} />

            <InfoBox>
              Grant token показывается при запуске RDP access. Если token закрыли
              или он истёк, запустите новый RDP access для этой целевой системы.
              Common Session остаётся в журнале и Audit.
            </InfoBox>
          </Section>
        )}

        {protocol === "https" && (
          <Section title="HTTPS access">
            <Row label="Launch URL" value={launchUrl || "—"} />

            {launchUrl && (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await copyText(String(launchUrl));
                    toast.success("HTTPS URL скопирован");
                  }}
                  className="flex-1 px-3 py-2 rounded bg-[#1A243F] text-sm inline-flex items-center justify-center gap-2"
                >
                  <Copy size={15} />
                  Скопировать URL
                </button>

                <button
                  type="button"
                  onClick={() =>
                    window.open(String(launchUrl), "_blank", "noopener,noreferrer")
                  }
                  className="flex-1 px-3 py-2 rounded bg-[#0052FF] text-sm"
                >
                  Открыть HTTPS
                </button>
              </div>
            )}
          </Section>
        )}

        {protocol === "mssql" && (
          <Section title="MS SQL access">
            <Row label="Server" value={targetPort ? `${session.ip},${targetPort}` : session.ip} />
            <Row label="User" value={targetUser || "—"} />

            {connectionString ? (
              <>
                <div className="rounded-xl border border-[#1E2A45] bg-[#0B1221] p-3 font-mono text-xs text-[#3BE3FD] break-all">
                  {String(connectionString)}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await copyText(String(connectionString));
                    toast.success("MS SQL connection string скопирован");
                  }}
                  className="w-full px-3 py-2 rounded bg-[#0052FF] text-sm inline-flex items-center justify-center gap-2"
                >
                  <Copy size={15} />
                  Скопировать строку подключения
                </button>
              </>
            ) : (
              <InfoBox>
                Строка подключения не сохранена в details этой сессии. Для нового
                доступа запустите MS SQL access повторно.
              </InfoBox>
            )}
          </Section>
        )}

        {protocol === "vnc" && (
          <Section title="VNC access">
            <Row label="Target" value={targetPort ? `${session.ip}:${targetPort}` : session.ip} />
            <Row label="Launch host:port" value={hostPort || "—"} />
            <Row label="User" value={targetUser || "—"} />

            {hostPort && (
              <button
                type="button"
                onClick={async () => {
                  await copyText(hostPort);
                  toast.success("VNC host:port скопирован");
                }}
                className="w-full px-3 py-2 rounded bg-[#0052FF] text-sm inline-flex items-center justify-center gap-2"
              >
                <Copy size={15} />
                Скопировать host:port
              </button>
            )}
          </Section>
        )}

        {protocol === "ssh" && (
          <Section title="SSH access">
            <InfoBox>
              Для SSH используется отдельный экран подключения. Нажмите
              “Подключиться” в таблице активных SSH-сессий.
            </InfoBox>
          </Section>
        )}

        {session.status === "failed" && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded">
            Доступ запрещён политикой
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={!canTerminate}
            className="w-full bg-red-600 py-2 rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
            onClick={() => setConfirmOpen(true)}
          >
            {canTerminate ? "Завершить сессию" : "Сессия уже завершена"}
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 rounded-xl border border-[#1E2A45] bg-[#0E1A3A] p-4">
      <h3 className="text-sm font-semibold text-gray-200 mb-3">{title}</h3>
      <div className="space-y-2 text-sm">{children}</div>
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
    <div className="flex justify-between gap-4 border-b border-[#1E2A45]/70 pb-2 last:border-b-0">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-right text-gray-100 break-all">{value ?? "—"}</span>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-100 leading-6">
      {children}
    </div>
  );
}