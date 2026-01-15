export type PlaybookSeverity = "LOW" | "MEDIUM" | "HIGH";

export type SocPlaybook = {
  key: string;
  title: string;
  description: string;

  // что мы считаем "сигналами" внутри timeline
  triggers: string[];

  // условия в текстовом виде (для объяснимости)
  conditions: string[];

  severity: PlaybookSeverity;

  // рекомендации, не автоматические действия
  recommended_actions: string[];
};

export const SOC_PLAYBOOKS: Record<string, SocPlaybook> = {
  LOGIN_FAIL_BURST: {
    key: "LOGIN_FAIL_BURST",
    title: "Brute-force attempt detected",
    description:
      "Multiple failed login attempts were detected within a short time window. This may indicate password guessing or credential stuffing.",

    triggers: ["LOGIN_FAIL"],

    conditions: [
      "Failed logins > 5",
      "Time window ≤ 10 minutes",
    ],

    severity: "MEDIUM",

    recommended_actions: [
      "Investigate the source IP (check if it is new or suspicious)",
      "Block the user if it is not expected activity",
      "Force MFA for the user (if supported by process)",
      "Export incident report for audit trail",
    ],
  },

  MFA_FAIL_BURST: {
    key: "MFA_FAIL_BURST",
    title: "MFA failures detected",
    description:
      "Multiple MFA verification failures may indicate a compromised device, a phishing attempt, or unauthorized access.",

    triggers: ["MFA_FAIL"],

    conditions: [
      "MFA failures > 3",
      "Time window ≤ 10 minutes",
    ],

    severity: "HIGH",

    recommended_actions: [
      "Confirm user identity via out-of-band channel",
      "Block user if activity is suspicious",
      "Invalidate active sessions (isolate session)",
      "Review recent login activity and IPs",
    ],
  },
};
