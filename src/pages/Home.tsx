import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Home() {
  const [stats, setStats] = useState({
    privileged: 0,
    users: 0,
    sessions: 0,
  });

  const [cpuData, setCpuData] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    async function load() {
      const p = await fetch("http://127.0.0.1:8000/stats/privileged-accounts").then(res => res.json());
      const u = await fetch("http://127.0.0.1:8000/stats/users").then(res => res.json());
      const s = await fetch("http://127.0.0.1:8000/stats/sessions").then(res => res.json());
      const cpu = await fetch("http://127.0.0.1:8000/stats/cpu").then(res => res.json());

      setStats({
        privileged: p.count,
        users: u.count,
        sessions: s.count,
      });

      const formatted = cpu.labels.map((label: string, i: number) => ({
        label,
        value: cpu.values[i],
      }));
      setCpuData(formatted);
    }

    load();
  }, []);

  return (
    <div className="text-[#0A0F24]">

      {/* Заголовок */}
      <h1 className="text-3xl font-bold mb-8">Главная</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">

        <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100 transition hover:shadow-xl">
          <p className="text-gray-500 text-sm">Привилегированные аккаунты</p>
          <h2 className="text-5xl font-bold text-[#0052FF] mt-2">{stats.privileged}</h2>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100 transition hover:shadow-xl">
          <p className="text-gray-500 text-sm">Всего пользователей</p>
          <h2 className="text-5xl font-bold text-[#0052FF] mt-2">{stats.users}</h2>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100 transition hover:shadow-xl">
          <p className="text-gray-500 text-sm">Активные сессии</p>
          <h2 className="text-5xl font-bold text-[#0052FF] mt-2">{stats.sessions}</h2>
        </div>

      </div>

      {/* CPU Chart */}
      <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
        <h2 className="text-xl font-semibold mb-4">CPU Load (%)</h2>

        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={cpuData}>
            <Line type="monotone" dataKey="value" stroke="#0052FF" strokeWidth={3} />
            <CartesianGrid stroke="#e5e7eb" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
