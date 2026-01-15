import { SOC_PLAYBOOKS, SocPlaybook } from "./playbooks";

type TimelineEvent = {
  action?: string;      // например "LOGIN_FAIL"
  timestamp?: string;   // "DD.MM.YYYY HH:MM:SS" или "DD.MM.YYYY HH:MM"
};

// безопасный парсер времени под KazPAM формат
function parseKazpamTime(value?: string): number | null {
  if (!value) return null;

  // поддержим "DD.MM.YYYY HH:MM" и "DD.MM.YYYY HH:MM:SS"
  const m = value.match(
    /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const HH = Number(m[4]);
  const MI = Number(m[5]);
  const SS = Number(m[6] ?? "0");

  // Date.UTC чтобы избежать проблем с локалью
  const t = Date.UTC(yyyy, mm - 1, dd, HH, MI, SS);
  if (!Number.isFinite(t)) return null;
  return t;
}

function countInWindow(
  events: TimelineEvent[],
  action: string,
  windowMs: number
): number {
  const times = events
    .filter((e) => e.action === action)
    .map((e) => parseKazpamTime(e.timestamp))
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);

  if (times.length === 0) return 0;

  // максимальное количество событий в любом "окне" длиной windowMs
  let best = 1;
  let left = 0;

  for (let right = 0; right < times.length; right++) {
    while (times[right] - times[left] > windowMs) left++;
    best = Math.max(best, right - left + 1);
  }

  return best;
}

/**
 * Возвращает playbook + объяснение (почему выбран)
 * UI-only: ничего не пишет, не меняет данные
 */
export function detectPlaybookFromTimeline(events: TimelineEvent[]): {
  playbook: SocPlaybook | null;
  reason: string[];
} {
  const reason: string[] = [];

  // Правила v1:
  // 1) MFA_FAIL_BURST: >= 3 за 10 минут
  // 2) LOGIN_FAIL_BURST: >= 6 за 10 минут
  // приоритет MFA выше

  const windowMs = 10 * 60 * 1000;

  const mfaFailMax = countInWindow(events, "MFA_FAIL", windowMs);
  if (mfaFailMax >= 3) {
    reason.push(`MFA_FAIL burst detected: max ${mfaFailMax} events within 10 minutes`);
    return { playbook: SOC_PLAYBOOKS.MFA_FAIL_BURST, reason };
  }

  const loginFailMax = countInWindow(events, "LOGIN_FAIL", windowMs);
  if (loginFailMax >= 6) {
    reason.push(`LOGIN_FAIL burst detected: max ${loginFailMax} events within 10 minutes`);
    return { playbook: SOC_PLAYBOOKS.LOGIN_FAIL_BURST, reason };
  }

  reason.push("No playbook matched: thresholds not reached");
  return { playbook: null, reason };
}
