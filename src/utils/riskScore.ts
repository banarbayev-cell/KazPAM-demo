// src/utils/riskScore.ts
import { AuditLog } from "../api/audit";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export function calculateRiskScore(logs: AuditLog[]) {
  let score = 0;

  logs.forEach((log) => {
  const action = (log.action || "").toUpperCase();

  // ✅ FAIL burst (твой основной кейс)
  if (action.includes("FAIL")) score += 15;

  // ✅ неизвестный источник
  if (action.includes("UNKNOWN")) score += 20;

  // ✅ deny / forbidden
  if (action.includes("DENY") || action.includes("FORBIDDEN")) score += 15;

  // ✅ privilege escalation
  if (action.includes("PRIVILEGE")) score += 30;

  // ✅ suspicious commands
  if (action.includes("COMMAND")) score += 10;
});

  if (score > 100) score = 100;

  let level: RiskLevel = "LOW";
  if (score >= 80) level = "CRITICAL";
  else if (score >= 60) level = "HIGH";
  else if (score >= 30) level = "MEDIUM";

  return { score, level };
}
