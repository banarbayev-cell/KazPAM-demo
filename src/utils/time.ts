// Unified Kazakhstan time (UTC+5 year-round, no DST)
const KZ_TIMEZONE = "Etc/GMT-5";

export type NaiveInputMode = "utc" | "kz";

type ParseOptions = {
  naiveInput?: NaiveInputMode;
};

type FormatOptions = ParseOptions & {
  seconds?: boolean;
};

const KZ_TEXT_RE =
  /^(\d{2})\.(\d{2})\.(\d{4})(?:[,\sT]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;

const ISO_NO_TZ_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function normalizeKzDisplayString(
  match: RegExpMatchArray,
  seconds = true
): string {
  const dd = match[1];
  const mm = match[2];
  const yyyy = match[3];
  const hh = match[4] ?? "00";
  const mi = match[5] ?? "00";
  const ss = match[6] ?? "00";

  return seconds
    ? `${dd}.${mm}.${yyyy} ${hh}:${mi}:${ss}`
    : `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

function buildDateFromIsoParts(
  match: RegExpMatchArray,
  naiveInput: NaiveInputMode
): Date | null {
  const yyyy = Number(match[1]);
  const mm = Number(match[2]);
  const dd = Number(match[3]);
  const hh = Number(match[4] ?? "0");
  const mi = Number(match[5] ?? "0");
  const ss = Number(match[6] ?? "0");
  const rawMs = (match[7] ?? "0").slice(0, 3);
  const ms = Number(rawMs.padEnd(3, "0"));

  if (naiveInput === "utc") {
    const iso = `${match[1]}-${match[2]}-${match[3]}T${pad2(hh)}:${pad2(
      mi
    )}:${pad2(ss)}.${String(ms).padStart(3, "0")}Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // naiveInput === "kz"
  // Treat input as already Kazakhstan wall time (UTC+5), convert to actual instant
  const d = new Date(Date.UTC(yyyy, mm - 1, dd, hh - 5, mi, ss, ms));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatWithIntl(date: Date, seconds = true): string {
  const value = new Intl.DateTimeFormat("ru-RU", {
    timeZone: KZ_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: seconds ? "2-digit" : undefined,
    hour12: false,
  }).format(date);

  return value.replace(",", "");
}

export function parseBackendDate(
  value?: string | Date | null,
  options: ParseOptions = {}
): Date | null {
  if (!value) return null;

  const naiveInput = options.naiveInput ?? "utc";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const kzMatch = raw.match(KZ_TEXT_RE);
  if (kzMatch) {
    const yyyy = Number(kzMatch[3]);
    const mm = Number(kzMatch[2]);
    const dd = Number(kzMatch[1]);
    const hh = Number(kzMatch[4] ?? "0");
    const mi = Number(kzMatch[5] ?? "0");
    const ss = Number(kzMatch[6] ?? "0");

    const d = new Date(Date.UTC(yyyy, mm - 1, dd, hh - 5, mi, ss));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const hasTimezone = /(?:Z|[+\-]\d{2}:\d{2})$/.test(raw);
  if (hasTimezone) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const normalized = raw.replace(" ", "T");
  const isoMatch = normalized.match(ISO_NO_TZ_RE);
  if (isoMatch) {
    return buildDateFromIsoParts(isoMatch, naiveInput);
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getBackendTimeMs(
  value?: string | Date | null,
  options: ParseOptions = {}
): number | null {
  const d = parseBackendDate(value, options);
  return d ? d.getTime() : null;
}

export function formatKzDateTime(
  value?: string | Date | null,
  options: FormatOptions = {}
): string {
  if (!value) return "—";

  const seconds = options.seconds ?? false;
  const naiveInput = options.naiveInput ?? "utc";

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return "—";

    const kzMatch = raw.match(KZ_TEXT_RE);
    if (kzMatch) {
      return normalizeKzDisplayString(kzMatch, seconds);
    }
  }

  const d = parseBackendDate(value, { naiveInput });
  if (!d) return typeof value === "string" ? value : "—";

  return formatWithIntl(d, seconds);
}

export function formatKzDate(
  value?: string | Date | null,
  options: ParseOptions = {}
): string {
  const full = formatKzDateTime(value, { ...options, seconds: false });
  if (full === "—") return full;
  return full.split(" ")[0] || full;
}

export function formatKzTime(
  value?: string | Date | null,
  options: ParseOptions = {}
): string {
  const full = formatKzDateTime(value, { ...options, seconds: false });
  if (full === "—") return full;
  return full.split(" ")[1] || full;
}

// Backward-compatible legacy exports
// Старые вызовы в проекте продолжают работать без регрессий.

export function formatToAlmaty(datetime: string): string {
  return formatKzDateTime(datetime, {
    seconds: true,
    naiveInput: "utc",
  });
}

export function formatDateTime(datetime: string): string {
  return formatKzDateTime(datetime, {
    seconds: false,
    naiveInput: "utc",
  });
}

export function formatDate(datetime: string): string {
  return formatKzDate(datetime, {
    naiveInput: "utc",
  });
}