// src/utils/notificationResolver.ts

export interface ResolverContext {
  users?: Record<number, string>;    // user_id → email / name
  roles?: Record<number, string>;    // role_id → role name
  policies?: Record<number, string>; // policy_id → policy name
}

function safeNum(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function safeStr(v: any): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

export function resolveNotification(
  action: string,
  details: any,
  ctx: ResolverContext = {}
): string {
  const d = details ?? {};

  try {
    switch (action) {
      // ===== AUTH =====
      case "LOGIN_SUCCESS":
        return "Успешный вход в систему";

      case "LOGIN_FAIL":
        return "Ошибка входа в систему";

      case "LOGOUT":
        return "Выход из системы";

      // ===== ROLES =====
      case "ROLE_ASSIGN":
      case "role.assign": {
        const userId = safeNum(d.user_id);
        const roleId = safeNum(d.role_id);
        return `Пользователю ${user(ctx, userId)} назначена роль «${role(ctx, roleId)}»`;
      }

      case "ROLE_UNASSIGN":
      case "role.unassign": {
        const userId = safeNum(d.user_id);
        const roleId = safeNum(d.role_id);
        return `У пользователя ${user(ctx, userId)} удалена роль «${role(ctx, roleId)}»`;
      }

      // ===== POLICIES =====
      case "POLICY_ATTACH": {
        const policyId = safeNum(d.policy_id);
        const roleId = safeNum(d.role_id);
        return `Политика «${policy(ctx, policyId)}» привязана к роли «${role(ctx, roleId)}»`;
      }

      case "POLICY_DETACH": {
        const policyId = safeNum(d.policy_id);
        const roleId = safeNum(d.role_id);
        return `Политика «${policy(ctx, policyId)}» отвязана от роли «${role(ctx, roleId)}»`;
      }

      case "create_policy": {
        // backend иногда шлёт строку в details
        const text = safeStr(d?.raw) ?? safeStr(d?.text) ?? safeStr(d);
        return text ? `Создана политика: ${text}` : "Создана политика";
      }

      case "update_policy": {
        const text = safeStr(d?.raw) ?? safeStr(d?.text) ?? safeStr(d);
        return text ? `Изменена политика: ${text}` : "Изменена политика";
      }

      // ===== SOC =====
      case "SOC_BLOCK_USER":
        return "SOC: пользователь заблокирован";

      case "SOC_ISOLATE_SESSION":
        return "SOC: сессия изолирована";

      // ===== FALLBACK =====
      default: {
        // ВАЖНО: больше не “системное событие” без информации
        const rawText = safeStr(d?.raw) ?? safeStr(d?.text);
        if (rawText) return rawText;
        return `Событие: ${action}`;
      }
    }
  } catch {
    return `Событие: ${action}`;
  }
}

// ===== helpers =====
function user(ctx: ResolverContext, id?: number) {
  if (!id) return "—";
  return ctx.users?.[id] ?? `ID ${id}`;
}

function role(ctx: ResolverContext, id?: number) {
  if (!id) return "—";
  return ctx.roles?.[id] ?? `ID ${id}`;
}

function policy(ctx: ResolverContext, id?: number) {
  if (!id) return "—";
  return ctx.policies?.[id] ?? `ID ${id}`;
}
