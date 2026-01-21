export function formatPolicyHistoryAction(
  action: string,
  details?: {
    changes?: Record<string, [any, any]>;
  }
): string {
  if (!action) return "—";

  if (action === "create_policy") {
    return "Создана политика";
  }

  if (action === "update_policy") {
    if (
      details &&
      typeof details === "object" &&
      details.changes &&
      typeof details.changes === "object"
    ) {
      const fieldMap: Record<string, string> = {
        status: "Статус",
        name: "Название",
        type: "Тип",
        mfa_required: "MFA",
        ip_range: "IP диапазон",
        session_limit: "Лимит сессии",
        time_start: "Начало окна доступа",
        time_end: "Конец окна доступа",
      };

      const normalize = (v: any) => {
        if (v === "active") return "Активна";
        if (v === "disabled") return "Отключена";
        if (v === true) return "Да";
        if (v === false) return "Нет";
        return String(v);
      };

      return Object.entries(details.changes)
        .map(([field, value]) => {
          if (!Array.isArray(value) || value.length !== 2) return null;
          const [from, to] = value;
          return `${fieldMap[field] ?? field}: ${normalize(
            from
          )} → ${normalize(to)}`;
        })
        .filter(Boolean)
        .join("; ");
    }

    return "Политика обновлена";
  }

  return action;
}
