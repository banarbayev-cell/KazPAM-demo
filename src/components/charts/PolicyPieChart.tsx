import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface ChartProps {
  active: number;
  disabled: number;
}

export default function PolicyPieChart({ active, disabled }: ChartProps) {
  const data = [
    { name: "Активные", value: active },
    { name: "Отключенные", value: disabled },
  ];

  const COLORS = ["#22C55E", "#EF4444"];

  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow p-4 w-[320px]">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Статистика политик</h2>
      <PieChart width={300} height={240}>
        <Pie
          data={data}
          cx={150}
          cy={120}
          innerRadius={50}
          outerRadius={80}
          dataKey="value"
          paddingAngle={4}
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={COLORS[idx]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}
