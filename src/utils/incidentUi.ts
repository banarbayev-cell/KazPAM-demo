import type { IncidentStatus } from "../api/incidents";

export function getIncidentStatusBadgeClass(status?: string) {
  const s = (status || "").toUpperCase();

  if (s === "OPEN" || s === "ESCALATED") {
    return "bg-red-500/20 text-red-300 border border-red-500/30";
  }

  if (s === "INVESTIGATING") {
    return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
  }

  if (s === "RESOLVED" || s === "CLOSED") {
    return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  }

  return "bg-[#0E1A3A] text-gray-300 border border-[#24314F]";
}

export function getIncidentSeverityBadgeClass(severity?: string) {
  const s = (severity || "").toUpperCase();

  if (s === "CRITICAL") {
    return "bg-red-500/20 text-red-300 border border-red-500/30";
  }

  if (s === "HIGH") {
    return "bg-orange-500/20 text-orange-300 border border-orange-500/30";
  }

  if (s === "MEDIUM") {
    return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
  }

  return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
}

export function getIncidentRiskBarClass(score?: number) {
  if (!Number.isFinite(score)) return "bg-gray-600";
  if ((score ?? 0) >= 90) return "bg-red-500";
  if ((score ?? 0) >= 70) return "bg-orange-500";
  if ((score ?? 0) >= 40) return "bg-yellow-500";
  return "bg-green-500";
}

export function getNextIncidentStatus(status?: IncidentStatus): IncidentStatus {
  switch (status) {
    case "OPEN":
    case "ESCALATED":
      return "INVESTIGATING";

    case "INVESTIGATING":
      return "RESOLVED";

    case "RESOLVED":
      return "CLOSED";

    case "CLOSED":
      return "OPEN";

    default:
      return "OPEN";
  }
}

export function getNextIncidentStatusLabel(status?: IncidentStatus) {
  switch (status) {
    case "OPEN":
    case "ESCALATED":
      return "В работу";

    case "INVESTIGATING":
      return "Отметить как решённый";

    case "RESOLVED":
      return "Закрыть";

    case "CLOSED":
      return "Переоткрыть";

    default:
      return "Обновить";
  }
}