// src/pages/License.tsx
import { useEffect, useMemo, useState } from "react";
import { fetchLicenseInfo, type LicenseInfo } from "../api/license";

type UiLevel = "ok" | "warn" | "critical" | "expired";

function formatDateAstana(iso: string) {
  // показывает в привычном виде (локаль ru-RU), без "сегодня"
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Almaty",
  }).format(d);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getLevel(info: LicenseInfo): UiLevel {
  if (info.expired) return "expired";
  if (info.max_users <= 0) return "critical";
  const pct = (info.used_users / info.max_users) * 100;
  if (pct >= 95) return "critical";
  if (pct >= 80) return "warn";
  return "ok";
}

function levelLabel(level: UiLevel) {
  switch (level) {
    case "ok":
      return "Активна";
    case "warn":
      return "Почти заполнено";
    case "critical":
      return "Лимит достигнут";
    case "expired":
      return "Истекла";
  }
}

function levelChipClasses(level: UiLevel) {
  // без привязки к твоей палитре акцента — но визуально в твоём тёмном стиле
  // (если хочешь — потом подгоним под #0052FF / #3BE3FD)
  switch (level) {
    case "ok":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "warn":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "critical":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "expired":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  }
}

function FeatureChip({ code }: { code: string }) {
  const label =
    code === "core" ? "Core" : code === "vault" ? "Vault" : code === "soc" ? "SOC" : code;
  return (
    <span className="inline-flex items-center rounded-full border border-[#1E2A45] bg-[#0A0F24] px-2.5 py-1 text-xs text-gray-200">
      {label}
    </span>
  );
}

export default function License() {
  const [data, setData] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      setErr(null);
      const res = await fetchLicenseInfo();
      setData(res);
    } catch (e: any) {
      setErr(e?.message || "Не удалось загрузить лицензию");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const level = useMemo(() => (data ? getLevel(data) : "ok"), [data]);

  const usage = useMemo(() => {
    if (!data) return { pct: 0, used: 0, max: 0 };
    const max = data.max_users || 0;
    const used = data.used_users || 0;
    const pct = max > 0 ? clamp((used / max) * 100, 0, 100) : 0;
    return { pct, used, max };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xl font-semibold text-gray-100">License</div>
          <div className="text-sm text-gray-400">Коммерческая лицензия и лимиты пользователей</div>
        </div>

        <button
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center rounded-xl border border-[#1E2A45] bg-[#121A33] px-4 py-2 text-sm text-gray-200 hover:bg-[#0E1A3A] disabled:opacity-60"
        >
          {refreshing ? "Обновляю..." : "Обновить"}
        </button>
      </div>

      {/* Skeleton / Error */}
      {loading && (
        <div className="rounded-2xl border border-[#1E2A45] bg-[#121A33] p-4 text-gray-300">
          Загрузка лицензии...
        </div>
      )}

      {!loading && err && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
          {err}
        </div>
      )}

      {!loading && data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Main card */}
          <div className="lg:col-span-2 rounded-2xl border border-[#1E2A45] bg-[#121A33] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-gray-400">Заказчик</div>
                <div className="mt-1 text-lg font-semibold text-gray-100">{data.customer}</div>
              </div>

              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs",
                  levelChipClasses(level),
                ].join(" ")}
              >
                {levelLabel(level)}
              </span>
            </div>

            {/* Usage */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">Пользователи</div>
                <div className="text-sm text-gray-200">
                  <span className="font-semibold">{usage.used}</span>
                  <span className="text-gray-400"> / {usage.max}</span>
                  <span className="ml-2 text-gray-400">({Math.round(usage.pct)}%)</span>
                </div>
              </div>

              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#0A0F24]">
                <div
                  className="h-3 rounded-full bg-[#0052FF]"
                  style={{ width: `${usage.pct}%` }}
                />
              </div>

              <div className="mt-2 text-xs text-gray-400">
                Порог предупреждения: 80% • критический: 95%
              </div>
            </div>

            {/* Details */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#1E2A45] bg-[#0A0F24] p-4">
                <div className="text-xs text-gray-400">Срок действия</div>
                <div className="mt-1 text-sm text-gray-100">{formatDateAstana(data.expires_at)}</div>
                <div className="mt-1 text-xs text-gray-400">
                  {data.expired ? "Лицензия истекла" : "Лицензия активна"}
                </div>
              </div>

              <div className="rounded-2xl border border-[#1E2A45] bg-[#0A0F24] p-4">
                <div className="text-xs text-gray-400">Функции</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(data.features || []).length === 0 ? (
                    <span className="text-sm text-gray-300">—</span>
                  ) : (
                    data.features.map((f) => <FeatureChip key={f} code={f} />)
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Side card */}
          <div className="rounded-2xl border border-[#1E2A45] bg-[#121A33] p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-100">Прозрачность</div>
            <div className="mt-2 space-y-2 text-sm text-gray-300">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Max seats</span>
                <span className="text-gray-100">{data.max_users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Used seats</span>
                <span className="text-gray-100">{data.used_users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Expired</span>
                <span className="text-gray-100">{data.expired ? "true" : "false"}</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#1E2A45] bg-[#0A0F24] p-4">
              <div className="text-xs text-gray-400">Памятка </div>
              <div className="mt-1 text-sm text-gray-200">
                Система контролирует использование лицензии в реальном времени.
При необходимости лимит пользователей может быть расширен. Обратитесь к партнеру
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}