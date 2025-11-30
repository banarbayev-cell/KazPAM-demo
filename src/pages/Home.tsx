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
    <div className="text-black">
      <h1 className="text-3xl font-bold mb-6">Главная</h1>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-white rounded-xl shadow">
          <p>Привилегированные аккаунты</p>
          <h2 className="text-4xl font-bold">{stats.privileged}</h2>
        </div>

        <div className="p-6 bg-white rounded-xl shadow">
          <p>Всего пользователей</p>
          <h2 className="text-4xl font-bold">{stats.users}</h2>
        </div>

        <div className="p-6 bg-white rounded-xl shadow">
          <p>Активные сессии</p>
          <h2 className="text-4xl font-bold">{stats.sessions}</h2>
        </div>
      </div>

      <div className="p-6 bg-white rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">CPU Load (%)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={cpuData}>
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} />
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
