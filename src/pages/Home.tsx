import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Mon", sessions: 12 },
  { name: "Tue", sessions: 18 },
  { name: "Wed", sessions: 25 },
  { name: "Thu", sessions: 30 },
  { name: "Fri", sessions: 22 },
  { name: "Sat", sessions: 10 },
  { name: "Sun", sessions: 8 },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Обзор системы</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-gray-600">Привилегированные аккаунты</p>
          <h2 className="text-3xl font-bold mt-2">12</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-gray-600">Всего пользователей</p>
          <h2 className="text-3xl font-bold mt-2">142</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-gray-600">Нагрузка CPU</p>
          <h2 className="text-3xl font-bold mt-2">65%</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-gray-600">Активные сессии</p>
          <h2 className="text-3xl font-bold mt-2">8</h2>
        </div>
      </div>

      {/* Graph */}
<div className="bg-white p-6 rounded-xl shadow-md" style={{ height: "350px" }}>
  <h2 className="text-xl font-semibold mb-4">Активные сессии за неделю</h2>

  <ResponsiveContainer width="100%" height="80%">
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="sessions" stroke="#2563eb" strokeWidth={3} />
    </LineChart>
  </ResponsiveContainer>
</div>
    </div>
  );
}
