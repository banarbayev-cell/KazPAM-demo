// src/utils/riskScore.ts
import { AuditLog } from "../api/audit";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export function calculateRiskScore(logs: AuditLog[]) {
  let score = 0;

  logs.forEach((log) => {
    const action = (log.action || "").toUpperCase();

    if (action.includes("FAILED")) score += 15;
    if (action.includes("IP") || action.includes("UNKNOWN")) score += 20;
    if (action.includes("DENY") || action.includes("FORBIDDEN")) score += 15;
    if (action.includes("PRIVILEGE")) score += 30;
    if (action.includes("COMMAND")) score += 10;
  });

  if (score > 100) score = 100;

  let level: RiskLevel = "LOW";
  if (score >= 80) level = "CRITICAL";
  else if (score >= 60) level = "HIGH";
  else if (score >= 30) level = "MEDIUM";

  return { score, level };
}
