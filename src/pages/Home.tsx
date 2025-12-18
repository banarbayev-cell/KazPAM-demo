import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API = import.meta.env.VITE_API_URL;

/* =======================
   TYPES
======================= */

interface Stats {
  privileged: number;
  users: number;
  sessions: number;
}

interface CpuPoint {
  label: string;
  value: number;
}

interface FailedSessionsAlert {
  window_minutes: number;
  threshold: number;
  failed_count: number;
  alert: boolean;
}

/* =======================
   PAGE
======================= */

export default function Home() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats>({
    privileged: 0,
    users: 0,
    sessions: 0,
  });

  const [cpuData, setCpuData] = useState<CpuPoint[]>([]);
  const [failedAlert, setFailedAlert] =
    useState<FailedSessionsAlert | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("Не найден токен авторизации");
          return;
        }

        const headers = {
          Authorization: "Bearer " + token,
        };

        const [
          privilegedRes,
          usersRes,
          sessionsRes,
          cpuRes,
          failedAlertRes,
        ] = await Promise.all([
          fetch(`${API}/stats/privileged-accounts`, { headers }).then((r) =>
            r.json()
          ),
          fetch(`${API}/stats/users`, { headers }).then((r) => r.json()),
          fetch(`${API}/stats/sessions`, { headers }).then((r) => r.json()),
          fetch(`${API}/stats/cpu`, { headers }).then((r) => r.json()),
          fetch(`${API}/sessions/alerts/failed`, { headers }).then((r) =>
            r.json()
          ),
        ]);

        setStats({
          privileged: privilegedRes.count ?? 0,
          users: usersRes.count ?? 0,
          sessions: sessionsRes.count ?? 0,
        });

        if (Array.isArray(cpuRes?.labels) && Array.isArray(cpuRes?.values)) {
          setCpuData(
            cpuRes.labels.map((label: string, i: number) => ({
              label,
              value: cpuRes.values[i] ?? 0,
            }))
          );
        } else {
          setCpuData([]);
        }

        setFailedAlert(failedAlertRes);
      } catch {
        setError("Не удалось загрузить данные дашборда");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="text-gray-500">Загрузка данных…</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  /* =======================
     RENDER
  ======================= */

  return (
    <div className="space-y-8 bg-gray-100 text-gray-900">

      {/* HEADER */}
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-6">
        <h1 className="text-2xl font-bold text-white">
          Dashboard · Добро пожаловать в {" "} <span className="font-bold"> Kaz<span className="text-[#0052FF]">PAM</span>
        </span>  
        </h1>
        <p className="text-gray-400 mt-1">
          Статус системы и контроль доступа
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <KpiCard title="Привилегированные аккаунты" value={stats.privileged} />
        <KpiCard title="Пользователи" value={stats.users} />
        <KpiCard title="Активные сессии" value={stats.sessions} />
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4 text-white">
          Быстрые действия
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <QuickAction
            title="Пользователи"
            description="Управление учетками"
            onClick={() => navigate("/users")}
          />
          <QuickAction
            title="Сессии"
            description="Активные подключения"
            onClick={() => navigate("/sessions")}
          />
          <QuickAction
            title="Аудит"
            description="События безопасности"
            onClick={() => navigate("/audit")}
          />
          <QuickAction
            title="SOC"
            description="Центр мониторинга"
            onClick={() => navigate("/soc")}
          />
        </div>
      </div>

      {/* SECURITY POSTURE */}
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">
          Security Posture
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatusCard title="RBAC" status="Active" />
          <StatusCard title="MFA" status="Enforced" />
          <StatusCard title="Policy Engine" status="Enabled" />
          <StatusCard title="Session Limits" status="Enforced" />
        </div>
      </div>

      {/* ALERTS */}
      {failedAlert && (
        <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">
            Failed Sessions Alert
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">
                За последние {failedAlert.window_minutes} минут
              </p>
              <p className="text-3xl font-bold text-white mt-1">
                {failedAlert.failed_count}
              </p>
            </div>

            {failedAlert.alert ? (
              <span className="px-4 py-2 rounded-full bg-red-600/20 text-red-400 font-semibold text-sm">
                ALERT
              </span>
            ) : (
              <span className="px-4 py-2 rounded-full bg-green-600/20 text-green-400 font-semibold text-sm">
                NORMAL
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Threshold: {failedAlert.threshold}
          </p>
        </div>
      )}

      {/* CPU */}
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 text-white">
          CPU Load (%)
        </h2>

        {cpuData.length === 0 ? (
          <div className="text-gray-400 text-sm">
            Нет данных по CPU
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={cpuData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3BE3FD"
                strokeWidth={2}
              />
              <CartesianGrid stroke="#1E2A45" />
              <XAxis dataKey="label" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* =======================
   COMPONENTS
======================= */

function KpiCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-6">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-4xl font-bold text-[#3BE3FD] mt-2">
        {value}
      </p>
    </div>
  );
}

function StatusCard({ title, status }: { title: string; status: string }) {
  return (
    <div className="bg-[#1A243F] border border-[#1E2A45] rounded-lg p-4">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-white font-semibold">{status}</p>
    </div>
  );
}

function QuickAction({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="
        text-left p-4 rounded-lg
        bg-[#1A243F]
        border border-[#1E2A45]
        hover:border-[#3BE3FD]
        transition
      "
    >
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{description}</p>
    </button>
  );
}
