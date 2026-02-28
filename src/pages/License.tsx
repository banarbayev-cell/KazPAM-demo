// src/pages/License.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { fetchLicenseInfo, type LicenseInfo } from "../api/license";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Building,
  Activity,
  Shield,
} from "lucide-react";

type UiLevel = "ok" | "warn" | "critical" | "expired";

const astanaFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Almaty",
});

function formatDateAstana(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : astanaFormatter.format(d);
}

function getLevel(info: LicenseInfo): UiLevel {
  if (info.expired) return "expired";
  if (info.max_users <= 0) return "critical";
  const pct = (info.used_users / info.max_users) * 100;
  if (pct >= 95) return "critical";
  if (pct >= 80) return "warn";
  return "ok";
}

export default function License() {
  const [data, setData] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setErr(null);
      const res = await fetchLicenseInfo();
      setData(res);
    } catch (e: unknown) {
      setErr(
        e instanceof Error ? e.message : "Не удалось загрузить лицензию"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const {
    level,
    usage,
    isExpiringSoon,
    isExpiringCritical,
    daysToExpire,
  } = useMemo(() => {
    if (!data) {
      return {
        level: "ok" as UiLevel,
        usage: { pct: 0, used: 0, max: 0 },
        isExpiringSoon: false,
        isExpiringCritical: false,
        daysToExpire: null as number | null,
      };
    }

    const max = data.max_users || 0;
    const used = data.used_users || 0;
    const pct =
      max > 0 ? Math.min(100, Math.max(0, (used / max) * 100)) : 0;

    const days =
      Math.ceil(
        (new Date(data.expires_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      ) ?? null;

    const expSoon = !data.expired && days <= 30 && days >= 0;
    const expCritical = !data.expired && days <= 7 && days >= 0;

    return {
      level: getLevel(data),
      usage: { pct, used, max },
      isExpiringSoon: expSoon,
      isExpiringCritical: expCritical,
      daysToExpire: days,
    };
  }, [data]);

  const getStatusColor = () => {
    if (level === "ok") return "bg-green-500";
    if (level === "warn") return "bg-yellow-500";
    return "bg-red-500";
  };

  const getBorderColor = () => {
    if (level === "ok") return "border-l-green-500";
    if (level === "warn") return "border-l-yellow-500";
    return "border-l-red-500";
  };

  return (
    <div className="p-6 w-full bg-gray-100 min-h-screen text-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#121A33]">Лицензия</h1>
          <p className="text-sm text-gray-500 mt-1">
            Параметры лицензирования системы
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Обновление..." : "Обновить"}
        </button>
      </div>

      {loading && !refreshing && (
        <div className="p-10 text-center text-gray-400 animate-pulse bg-[#121A33] rounded-xl border border-[#1E2A45] shadow-lg">
          Загрузка конфигурации лицензии...
        </div>
      )}

      {err && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm mb-6 flex items-start gap-3">
          <AlertTriangle size={24} className="text-red-500" />
          <div>
            <h3 className="text-red-800 font-bold text-sm uppercase tracking-wider">
              Ошибка
            </h3>
            <p className="text-red-600 mt-1">{err}</p>
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* ===== LICENSE BANNERS ===== */}

          {data.expired && (
            <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-3">
              <XCircle className="text-red-400 mt-0.5" size={22} />
              <div>
                <div className="font-semibold text-red-300">
                  Срок действия лицензии истёк
                </div>
                <div className="text-sm text-red-200/80 mt-1">
                  Добавление пользователей и часть функций могут быть
                  ограничены. Обратитесь к партнёру для продления лицензии.
                </div>
              </div>
            </div>
          )}

          {!data.expired && isExpiringCritical && (
            <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-3">
              <AlertTriangle className="text-red-400 mt-0.5" size={22} />
              <div>
                <div className="font-semibold text-red-300">
                  Лицензия скоро истекает ({daysToExpire} дн.)
                </div>
                <div className="text-sm text-red-200/80 mt-1">
                  Рекомендуется заранее продлить лицензию.
                </div>
              </div>
            </div>
          )}

          {!data.expired &&
            !isExpiringCritical &&
            isExpiringSoon && (
              <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 flex items-start gap-3">
                <AlertTriangle
                  className="text-yellow-400 mt-0.5"
                  size={22}
                />
                <div>
                  <div className="font-semibold text-yellow-300">
                    Срок действия лицензии подходит к завершению (
                    {daysToExpire} дн.)
                  </div>
                  <div className="text-sm text-yellow-200/80 mt-1">
                    При необходимости заранее обратитесь к партнёру.
                  </div>
                </div>
              </div>
            )}

          {/* ===== KPI CARDS ===== */}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-start justify-center px-6">
              <span className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
                <Building size={14} /> Заказчик
              </span>
              <span
                className="text-xl font-bold text-gray-800 truncate w-full"
                title={data.customer}
              >
                {data.customer}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-blue-500 flex items-center justify-between px-6">
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold tracking-wider block mb-1">
                  Всего лицензий
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {usage.max}
                </span>
              </div>
              <Users size={32} className="text-blue-100" />
            </div>

            <div
              className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex items-center justify-between px-6 ${getBorderColor()}`}
            >
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold tracking-wider block mb-1">
                  Использовано
                </span>
                <span className="text-2xl font-bold text-gray-800">
                  {usage.used}
                </span>
              </div>
              <Activity size={32} className="text-gray-100" />
            </div>

            <div
              className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex items-center justify-between px-6 ${
                data.expired
                  ? "border-l-red-500"
                  : isExpiringCritical
                  ? "border-l-yellow-500"
                  : "border-l-green-500"
              }`}
            >
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold tracking-wider block mb-1">
                  Статус
                </span>
                <span
                  className={`text-xl font-bold ${
                    data.expired
                      ? "text-red-600"
                      : isExpiringCritical
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {data.expired
                    ? "Истекла"
                    : isExpiringCritical
                    ? "Скоро истекает"
                    : "Активна"}
                </span>
              </div>
              {data.expired ? (
                <XCircle size={32} className="text-red-100" />
              ) : (
                <CheckCircle2 size={32} className="text-green-100" />
              )}
            </div>
          </div>

          {/* ===== DARK PANEL ===== */}

          <div className="flex-grow rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33] p-6 text-white flex flex-col">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Shield size={20} className="text-blue-400" />
              Детализация использования
            </h2>

            <div className="bg-[#1A243F] p-5 rounded-lg border border-[#2A3455] mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-gray-400 text-sm">
                  Заполнение системы
                </span>
                <span className="text-white font-mono font-bold">
                  {Math.round(usage.pct)}% ({usage.used} / {usage.max})
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-[#0B1221] border border-[#1E2A45]">
                <div
                  className={`h-full transition-all duration-1000 ${getStatusColor()} ${
                    level === "critical"
                      ? "shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                      : ""
                  }`}
                  style={{ width: `${usage.pct}%` }}
                />
              </div>

              <div className="mt-3 text-xs text-gray-500 flex gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  Порог предупреждения: 80%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Лимит: 95%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1A243F] p-4 rounded-lg border border-[#2A3455]">
                <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider font-semibold">
                  Срок действия
                </div>
                <div className="font-mono text-white text-lg">
                  {formatDateAstana(data.expires_at)}
                </div>
              </div>

              <div className="bg-[#1A243F] p-4 rounded-lg border border-[#2A3455]">
                <div className="text-gray-400 text-xs mb-2 uppercase tracking-wider font-semibold">
                  Компоненты системы
                </div>
                <div className="text-sm text-blue-200 font-medium">
                  В рамках текущей лицензии доступны все модули KazPAM
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-900/50 rounded-lg">
              <p className="text-sm text-blue-200/70">
                Система контролирует использование лицензии в реальном
                времени. Для расширения лимитов обратитесь к партнёру.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}