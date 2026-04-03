import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  fetchIncidents,
  updateIncidentStatus,
  type IncidentItem,
  type IncidentStatus,
} from "../api/incidents";
import { formatKzDateTime } from "../utils/time";

function statusClass(status: string) {
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

function severityClass(severity: string) {
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

function nextStatus(item: IncidentItem): IncidentStatus {
  if (item.status === "OPEN" || item.status === "ESCALATED") return "INVESTIGATING";
  if (item.status === "INVESTIGATING") return "CLOSED";
  return "OPEN";
}

function nextStatusLabel(item: IncidentItem) {
  if (item.status === "OPEN") return "В работу";
  if (item.status === "INVESTIGATING") return "Закрыть";
  return "Переоткрыть";
}

export default function Incidents() {
  const [items, setItems] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchIncidents({
        status,
        severity,
        q,
      });

      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить incidents");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 250);

    return () => clearTimeout(timer);
  }, [status, severity, q]);

  const handleChangeStatus = async (item: IncidentItem) => {
    const targetStatus = nextStatus(item);

    try {
      setBusyId(item.id);
      await updateIncidentStatus(item.id, targetStatus);
      toast.success(`Incident #${item.id}: статус обновлён на ${targetStatus}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Не удалось обновить статус инцидента");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 space-y-6 text-[#0A0F24]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SOC · Incidents</h1>
          <p className="text-sm text-gray-600 mt-1">
            Просмотр, фильтрация и управление жизненным циклом инцидентов
          </p>
        </div>

        <Link
          to="/soc"
          className="px-4 py-2 rounded-lg border border-[#D7DEED] bg-white text-sm hover:bg-gray-50"
        >
          Назад в SOC
        </Link>
      </div>

      <div className="bg-[#121A33] border border-[#1E2A45] rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск: user / system / ip / summary / correlation_id"
          className="md:col-span-2 rounded-lg bg-[#0E1A3A] border border-[#24314F] px-3 py-2 text-white outline-none"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg bg-[#0E1A3A] border border-[#24314F] px-3 py-2 text-white outline-none"
        >
          <option value="all">Все статусы</option>
          <option value="OPEN">OPEN</option>
          <option value="INVESTIGATING">INVESTIGATING</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="ESCALATED">ESCALATED</option>
        </select>

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded-lg bg-[#0E1A3A] border border-[#24314F] px-3 py-2 text-white outline-none"
        >
          <option value="all">Все severity</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="ESCALATED">ESCALATED</option>
        </select>
      </div>

      <div className="bg-[#121A33] border border-[#1E2A45] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1E2A45] text-sm text-gray-300">
          {loading ? "Загрузка incidents..." : `Всего: ${items.length}`}
        </div>

        {error && (
          <div className="px-4 py-4 text-sm text-red-300 border-b border-[#1E2A45]">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0E1A3A] text-gray-300">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Время</th>
                <th className="text-left px-4 py-3">Пользователь</th>
                <th className="text-left px-4 py-3">Система</th>
                <th className="text-left px-4 py-3">IP</th>
                <th className="text-left px-4 py-3">Severity</th>
                <th className="text-left px-4 py-3">Risk</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Summary</th>
                <th className="text-left px-4 py-3">Действия</th>
              </tr>
            </thead>

            <tbody className="text-white">
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Инциденты не найдены
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-[#1E2A45] align-top">
                    <td className="px-4 py-3 font-semibold">#{item.id}</td>

                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {formatKzDateTime(item.created_at, {
                        seconds: false,
                        naiveInput: "utc",
                      })}
                    </td>

                    <td className="px-4 py-3">{item.user}</td>
                    <td className="px-4 py-3">{item.system}</td>
                    <td className="px-4 py-3">{item.ip}</td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${severityClass(item.severity)}`}>
                        {item.severity}
                      </span>
                    </td>

                    <td className="px-4 py-3">{item.risk_score}</td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-gray-300 max-w-[320px]">
                      {item.summary || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2 min-w-[150px]">
                        <Link
                          to={`/soc/incidents/${item.id}`}
                          className="px-3 py-2 rounded-lg bg-[#0E1A3A] border border-[#24314F] text-center hover:bg-[#12224A]"
                        >
                          Открыть
                        </Link>

                        <button
                          onClick={() => handleChangeStatus(item)}
                          disabled={busyId === item.id}
                          className="px-3 py-2 rounded-lg bg-[#1E2A45] border border-[#2D3A5A] hover:bg-[#25365D] disabled:opacity-50"
                        >
                          {busyId === item.id ? "Обновление..." : nextStatusLabel(item)}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}