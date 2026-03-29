type Primitive = string | number | boolean | null | undefined;
type LegacyChangeValue = [Primitive | string[], Primitive | string[]];
type ModernChangeValue = {
  old?: Primitive | string[];
  new?: Primitive | string[];
};

interface PolicyHistoryDetails {
  raw?: string;
  changes?: Record<string, LegacyChangeValue | ModernChangeValue>;
}

function normalizeValue(v: Primitive | string[]): string {
  if (v === null || v === undefined || v === "") return "—";
  if (v === "active") return "Активна";
  if (v === "disabled") return "Отключена";
  if (v === true) return "Да";
  if (v === false) return "Нет";

  if (Array.isArray(v)) {
    return v.length ? v.join(", ") : "—";
  }

  return String(v);
}

function extractChangePair(
  value: LegacyChangeValue | ModernChangeValue | undefined
): [Primitive | string[] | undefined, Primitive | string[] | undefined] | null {
  if (!value) return null;

  if (Array.isArray(value) && value.length === 2) {
    return [value[0], value[1]];
  }

    if (!Array.isArray(value) && typeof value === "object") {
    return [value.old, value.new];
  }

  return null;
}

export function formatPolicyHistoryAction(
  action: string,
  details?: PolicyHistoryDetails
): string {
  if (!action) return "—";

  const normalizedAction = action.toLowerCase();

  if (
    normalizedAction === "create_policy" ||
    normalizedAction === "policy.create"
  ) {
    return "Создана политика";
  }

  if (
    normalizedAction === "delete_policy" ||
    normalizedAction === "policy.delete"
  ) {
    return "Политика удалена";
  }

  if (
    normalizedAction === "update_policy" ||
    normalizedAction === "policy.update"
  ) {
    const changes = details?.changes;

    if (changes && typeof changes === "object") {
      const fieldMap: Record<string, string> = {
        status: "Статус",
        name: "Название",
        type: "Тип",
        mfa_required: "MFA",
        ip_range: "IP диапазон",
        session_limit: "Лимит активных сессий",
        time_start: "Начало окна доступа",
        time_end: "Конец окна доступа",
        allowed_systems: "Разрешённые системы",
        enforce_all_policies: "Применять все политики",
      };

      const parts = Object.entries(changes)
        .map(([field, rawValue]) => {
          const pair = extractChangePair(rawValue);
          if (!pair) return null;

          const [from, to] = pair;
          return `${fieldMap[field] ?? field}: ${normalizeValue(
            from
          )} → ${normalizeValue(to)}`;
        })
        .filter((item): item is string => Boolean(item));

      if (parts.length > 0) {
        return parts.join("; ");
      }
    }

    return "Политика обновлена";
  }

  if (typeof details?.raw === "string" && details.raw.trim()) {
    return details.raw.trim();
  }

  return action;
}