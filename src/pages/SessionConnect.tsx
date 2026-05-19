import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Copy,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
  KeyRound,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
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

function normalizeHost(value?: string | null) {
  return String(value || "").trim();
}

function isLocalOnlyGatewayHost(value?: string | null) {
  const host = normalizeHost(value).toLowerCase();

  return (
    !host ||
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1"
  );
}

function buildSshCommand(connectInfo: SessionConnectInfo) {
  const backendCommand = String(connectInfo.ssh_command || "").trim();

  if (backendCommand) {
    return backendCommand;
  }

  const proxyHost = normalizeHost(connectInfo.proxy_host);

  if (!proxyHost || isLocalOnlyGatewayHost(proxyHost)) {
    return "";
  }

  return `ssh -p ${connectInfo.proxy_port} ${connectInfo.grant_token}@${proxyHost}`;
}

function getGatewayConfigWarning(connectInfo: SessionConnectInfo) {
  const proxyHost = normalizeHost(connectInfo.proxy_host);
  const backendCommand = String(connectInfo.ssh_command || "").trim();

  if (backendCommand) {
    return "";
  }

  if (!proxyHost) {
    return "Gateway host не настроен. Backend должен вернуть публичный SSH Gateway host для подключения пользователя.";
  }

  if (isLocalOnlyGatewayHost(proxyHost)) {
    return `Gateway host сейчас указан как "${proxyHost}". Это локальный адрес сервера и он обычно недоступен с рабочей станции пользователя. Для production нужно настроить публичный DNS/IP KazPAM SSH Gateway.`;
  }

  return "";
}

function maskGrantToken(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  if (raw.length <= 10) return "••••••••";
  return `${raw.slice(0, 6)}••••••${raw.slice(-6)}`;
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

  const sshCommand = useMemo(() => {
    if (!connectInfo) return "";
    return buildSshCommand(connectInfo);
  }, [connectInfo]);

  const gatewayWarning = useMemo(() => {
    if (!connectInfo) return "";
    return getGatewayConfigWarning(connectInfo);
  }, [connectInfo]);

  const canCopyCommand = Boolean(sshCommand);
  const gatewayReady = Boolean(connectInfo && !gatewayWarning && sshCommand);

  const handleCopyCommand = async () => {
    if (!sshCommand) {
      toast.error("Команда подключения недоступна: проверьте настройку SSH Gateway host");
      return;
    }

    try {
      await copyText(sshCommand);
      toast.success("Команда подключения скопирована");
    } catch {
      toast.error("Не удалось скопировать команду");
    }
  };

  const handleCopyToken = async () => {
    if (!connectInfo?.grant_token) {
      toast.error("Grant token недоступен");
      return;
    }

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

  const gatewayHost = normalizeHost(connectInfo.proxy_host) || "—";

  return (
    <div className="p-6 w-full bg-gray-100 text-gray-900">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Подключение к SSH-сессии</h1>

          <p className="text-sm text-gray-600 mt-2">
            Сессия уже создана в KazPAM. Для начала работы выполните готовую
            команду подключения через KazPAM SSH Gateway.
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-green-700 font-semibold">
            <ShieldCheck size={18} />
            Сессия активна
          </div>

          <div className="mt-2 text-sm text-gray-600 leading-6">
            KazPAM создал управляемую SSH-сессию. Все действия в рамках подключения
            идут через Gateway и попадают в контроль/audit.
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8DCE7] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <CheckCircle2 size={18} />
            Gateway readiness
          </div>

          <div className="mt-2 text-sm text-gray-600">
            {gatewayReady
              ? "Gateway host выглядит корректно, команда подключения готова."
              : "Нужно проверить gateway host / ssh_command на backend стороне."}
          </div>

          <div className="mt-4 text-xs text-gray-500 leading-5">
            Host: <span className="font-medium text-gray-800">{gatewayHost}</span>
            <br />
            Port: <span className="font-medium text-gray-800">{connectInfo.proxy_port}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8DCE7] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <KeyRound size={18} />
            Grant token
          </div>

          <div className="mt-2 text-sm text-gray-600 leading-6">
            Это временный технический пропуск для SSH Gateway. Пользователь
            обычно не вставляет его отдельно — он уже встроен в команду подключения.
          </div>

          <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 font-mono text-xs text-gray-800 break-all">
            {maskGrantToken(connectInfo.grant_token)}
          </div>

          <button
            onClick={handleCopyToken}
            className="mt-3 px-3 py-2 rounded bg-[#1A243F] text-white text-sm inline-flex items-center gap-2"
          >
            <Copy size={15} />
            Скопировать token
          </button>
        </div>
      </div>

      {gatewayWarning && (
        <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 shadow-sm mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-700 mt-0.5" size={20} />

            <div>
              <div className="font-semibold text-yellow-900">
                Требуется настройка публичного SSH Gateway host
              </div>

              <div className="mt-1 text-sm text-yellow-900 leading-6">
                {gatewayWarning}
              </div>

              <div className="mt-2 text-xs text-yellow-800 leading-5">
                Для production это должно задаваться на backend/gateway уровне.
                Frontend здесь только показывает готовые параметры, а не угадывает адрес.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#D8DCE7] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Параметры сессии</h2>

          <div className="space-y-3 text-sm">
            <Row label="Session ID" value={connectInfo.session_id} />
            <Row label="Статус" value={connectInfo.session_status} />
            <Row label="Протокол" value={connectInfo.protocol?.toUpperCase()} />
            <Row label="Система" value={connectInfo.system} />
            <Row label="Target host" value={connectInfo.target_host} />
            <Row label="Target port" value={connectInfo.target_port} />
            <Row label="Target user" value={connectInfo.target_user} />
            <Row label="Gateway host" value={gatewayHost} />
            <Row label="Gateway port" value={connectInfo.proxy_port} />
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
            <h2 className="text-lg font-semibold">Готовая команда подключения</h2>
          </div>

          <div className="text-sm text-gray-600 mb-3 leading-6">
            Откройте PowerShell, Windows Terminal, macOS Terminal или Linux shell
            и выполните готовую команду ниже.
          </div>

          {sshCommand ? (
            <div className="rounded-xl border border-[#D8DCE7] bg-[#0E1A3A] p-4 text-green-300 font-mono text-sm break-all">
              {sshCommand}
            </div>
          ) : (
            <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900 leading-6">
              Команда подключения недоступна, потому что публичный адрес SSH Gateway
              не настроен. Настройте Gateway host на backend/gateway уровне и обновите доступ.
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleCopyCommand}
              disabled={!canCopyCommand}
              className="px-4 py-2 rounded bg-[#0052FF] text-white inline-flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Copy size={16} />
              Скопировать команду
            </button>

            <button
              onClick={() => navigate(`/audit?session_id=${connectInfo.session_id}`)}
              className="px-4 py-2 rounded bg-[#1A243F] text-white inline-flex items-center gap-2"
            >
              <ExternalLink size={16} />
              Открыть Audit
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-[#D8DCE7] bg-gray-50 p-4 text-sm text-gray-700 space-y-2">
            <div>1. Откройте PowerShell / Terminal / SSH-клиент.</div>
            <div>2. Скопируйте и выполните готовую команду подключения.</div>
            <div>3. KazPAM Gateway примет встроенный grant token автоматически.</div>
            <div>4. Дополнительно вставлять token в отдельное поле не нужно.</div>
            <div>5. Все события сессии фиксируются в Audit/SOC.</div>
          </div>

          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 leading-5">
            Grant token — это короткоживущий технический пропуск для KazPAM Gateway.
            Он уже встроен в SSH-команду как временное имя пользователя для gateway-auth
            и после истечения срока действия становится недействительным.
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#D8DCE7] bg-white p-5 shadow-sm">
        <div className="font-semibold text-gray-900 mb-3">Troubleshooting</div>

        <div className="space-y-2 text-sm text-gray-700 leading-6">
          <div>
            <b>Вижу экран, но команда пустая:</b> не настроен публичный SSH Gateway host.
          </div>
          <div>
            <b>Команда скопировалась, но не подключается:</b> проверьте доступность gateway host и порт {connectInfo.proxy_port}.
          </div>
          <div>
            <b>Token истёк:</b> нажмите “Обновить доступ”, будет выдан новый временный grant.
          </div>
          <div>
            <b>Сессию уже завершили:</b> экран подключения откроется только для активной SSH-сессии.
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