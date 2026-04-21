import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, RefreshCw, ShieldCheck, TerminalSquare } from "lucide-react";
import { toast } from "sonner";
import {
  getSessionConnectInfo,
  SessionConnectInfo,
  terminateSession,
} from "../api/sessions";

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

function normalizeDisplayProxyHost(rawHost?: string) {
  const value = String(rawHost || "").trim().toLowerCase();
  if (!value || value === "127.0.0.1" || value === "localhost" || value === "0.0.0.0") {
    return window.location.hostname || rawHost || "127.0.0.1";
  }
  return rawHost || value;
}

export default function SessionConnect() {
  const navigate = useNavigate();
  const { id } = useParams();
  const sessionId = Number(id);

  const [connectInfo, setConnectInfo] = useState<SessionConnectInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [error, setError] = useState("");

  const loadConnectInfo = async (silent = false) => {
    if (!Number.isFinite(sessionId)) {
      setError("Некорректный ID сессии");
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await getSessionConnectInfo(sessionId);
      setConnectInfo(data);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Не удалось подготовить данные для подключения");
      setConnectInfo(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadConnectInfo(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const displayProxyHost = useMemo(() => {
    return normalizeDisplayProxyHost(connectInfo?.proxy_host);
  }, [connectInfo?.proxy_host]);

  const sshCommand = useMemo(() => {
    if (!connectInfo) return "";
    return `ssh -p ${connectInfo.proxy_port} ${connectInfo.grant_token}@${displayProxyHost}`;
  }, [connectInfo, displayProxyHost]);

  const handleCopyCommand = async () => {
    try {
      await copyText(sshCommand);
      toast.success("Команда подключения скопирована");
    } catch {
      toast.error("Не удалось скопировать команду");
    }
  };

  const handleCopyGrant = async () => {
    if (!connectInfo?.grant_token) return;
    try {
      await copyText(connectInfo.grant_token);
      toast.success("Grant token скопирован");
    } catch {
      toast.error("Не удалось скопировать grant token");
    }
  };

  const handleTerminate = async () => {
    if (!connectInfo) return;

    const ok = window.confirm(
      `Завершить SSH-сессию #${connectInfo.session_id}?`
    );
    if (!ok) return;

    try {
      setTerminating(true);
      await terminateSession(connectInfo.session_id);
      toast.success("Сессия завершена");
      navigate("/sessions");
    } catch (e: any) {
      toast.error(e?.message || "Не удалось завершить сессию");
    } finally {
      setTerminating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 w-full bg-gray-100 text-gray-900">
        <h1 className="text-3xl font-bold mb-6">Подключение к SSH-сессии</h1>
        <div className="rounded-2xl border border-[#D8DCE7] bg-white p-6 shadow-sm">
          Подготовка данных подключения...
        </div>
      </div>
    );
  }

  if (error || !connectInfo) {
    return (
      <div className="p-6 w-full bg-gray-100 text-gray-900">
        <h1 className="text-3xl font-bold mb-6">Подключение к SSH-сессии</h1>

        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-red-600">
            Не удалось открыть экран подключения
          </div>

          <div className="mt-2 text-sm text-gray-600">
            {error || "Данные для подключения недоступны"}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate("/sessions")}
              className="px-4 py-2 rounded bg-[#1A243F] text-white"
            >
              Назад к сессиям
            </button>

            <button
              onClick={() => void loadConnectInfo(false)}
              className="px-4 py-2 rounded bg-[#0052FF] text-white"
            >
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Подключение к SSH-сессии</h1>
          <p className="text-sm text-gray-600 mt-2">
            Сессия уже создана в KazPAM. Для начала работы выполните команду
            подключения через KazPAM SSH Gateway.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate("/sessions")}
            className="px-4 py-2 rounded bg-[#1A243F] text-white"
          >
            Назад
          </button>

          <button
            onClick={() => void loadConnectInfo(true)}
            disabled={refreshing}
            className="px-4 py-2 rounded bg-[#0052FF] text-white disabled:bg-gray-500 inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            {refreshing ? "Обновление..." : "Обновить доступ"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm mb-6">
        <div className="flex items-center gap-2 text-green-700 font-semibold">
          <ShieldCheck size={18} />
          Сессия активна и готова к подключению
        </div>

        <div className="mt-2 text-sm text-gray-600">
          Доступ идёт через KazPAM Gateway, записывается и контролируется системой.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#D8DCE7] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Параметры сессии</h2>

          <div className="space-y-3 text-sm">
            <Row label="Session ID" value={connectInfo.session_id} />
            <Row label="Статус" value={connectInfo.session_status} />
            <Row label="Протокол" value={connectInfo.protocol?.toUpperCase()} />
            <Row label="Система" value={connectInfo.system} />
            <Row label="IP" value={connectInfo.ip} />
            <Row label="Target host" value={connectInfo.target_host} />
            <Row label="Target port" value={connectInfo.target_port} />
            <Row label="Target user" value={connectInfo.target_user} />
            <Row label="Gateway node" value={connectInfo.gateway_node || "—"} />
            <Row label="SSH auth mode" value={connectInfo.ssh_auth_mode || "—"} />
            <Row label="Grant expires" value={connectInfo.expires_at} />
          </div>

          {connectInfo.break_glass && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Break-glass сессия активна. Доступ выдан в аварийном режиме.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#D8DCE7] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TerminalSquare size={18} />
            <h2 className="text-lg font-semibold">Команда подключения</h2>
          </div>

          <div className="text-sm text-gray-600 mb-3">
            Откройте PowerShell, Terminal или SSH-клиент на своей рабочей станции
            и выполните команду ниже.
          </div>

          <div className="rounded-xl border border-[#D8DCE7] bg-[#0E1A3A] p-4 text-green-300 font-mono text-sm break-all">
            {sshCommand}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleCopyCommand}
              className="px-4 py-2 rounded bg-[#0052FF] text-white inline-flex items-center gap-2"
            >
              <Copy size={16} />
              Скопировать команду
            </button>

            <button
              onClick={handleCopyGrant}
              className="px-4 py-2 rounded bg-[#1A243F] text-white"
            >
              Скопировать grant token
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-[#D8DCE7] bg-gray-50 p-4 text-sm text-gray-700 space-y-2">
            <div>1. Откройте PowerShell / Terminal.</div>
            <div>2. Выполните команду подключения.</div>
            <div>3. При первом подключении SSH может попросить подтвердить host key.</div>
            <div>4. После этого откроется рабочая shell-сессия через KazPAM Gateway.</div>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Grant token краткоживущий и используется для контролируемого доступа к уже созданной PAM-сессии.
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => navigate(`/audit?session_id=${connectInfo.session_id}`)}
          className="px-4 py-2 rounded bg-[#1A243F] text-white"
        >
          Перейти в Audit
        </button>

        <button
          onClick={handleTerminate}
          disabled={terminating}
          className="px-4 py-2 rounded bg-red-600 text-white disabled:bg-red-300"
        >
          {terminating ? "Завершение..." : "Завершить сессию"}
        </button>
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
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900 break-all">
        {value ?? "—"}
      </span>
    </div>
  );
}