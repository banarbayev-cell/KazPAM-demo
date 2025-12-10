// Asia/Almaty — GMT+5
const ALMATY_TIMEZONE = "Asia/Almaty";

/**
 * Преобразует строку UTC (например "2025-12-07T08:51:45Z")
 * в формат "07.12.2025 13:51:45"
 */
export function formatToAlmaty(datetime: string): string {
  try {
    const date = new Date(datetime);

    return date.toLocaleString("ru-RU", {
      timeZone: ALMATY_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return datetime;
  }
}

/**
 * Только время → "13:57"
 */
export function formatDateTime(datetime: string): string {
  try {
    const date = new Date(datetime);

    return date.toLocaleTimeString("ru-RU", {
      timeZone: ALMATY_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return datetime;
  }
}

/**
 * Только дата → "07.12.2025"
 */
export function formatDate(datetime: string): string {
  try {
    const date = new Date(datetime);

    return date.toLocaleDateString("ru-RU", {
      timeZone: ALMATY_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return datetime;
  }
}
