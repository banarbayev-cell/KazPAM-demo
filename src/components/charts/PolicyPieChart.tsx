import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface ChartProps {
  active: number;
  disabled: number;
  title?: string; // новое поле
}

export default function PolicyPieChart({ active, disabled, title = "Статистика" }: ChartProps) {
  const data = [
    { name: "Активные", value: active },
    { name: "Ошибочные / Завершённые", value: disabled },
  ];

  const COLORS = ["#3BE3FD", "#0052FF"];

  return (
    <div className="w-[260px] h-[260px] bg-white border border-gray-200 shadow-md rounded-xl p-4">
      <h3 className="text-center font-semibold text-gray-700 mb-3">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
