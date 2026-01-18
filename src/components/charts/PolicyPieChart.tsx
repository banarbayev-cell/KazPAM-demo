import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface ChartProps {
  active: number;
  disabled: number;
  title?: string;
}

export default function PolicyPieChart({
  active,
  disabled,
  title = "Статистика",
}: ChartProps) {
  const total = active + disabled;

  const data = [
    { name: "Успешно", value: active },
    { name: "Ошибки", value: disabled },
  ];

  const COLORS = ["#3BE3FD", "#0052FF"];

  return (
    <div className="w-[400px] bg-white border border-gray-200 shadow-md rounded-xl p-4">
      <h3 className="text-center font-semibold text-gray-700 mb-3">
        {title}
      </h3>

      <div className="flex items-center gap-4">
        {/* CHART */}
        <div className="w-[170px] h-[170px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                isAnimationActive={false}
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* STATS */}
        <div className="flex flex-col justify-center gap-2 text-sm text-gray-700">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Всего событий
          </div>

          <div className="text-3xl font-bold text-gray-900 leading-none">
            {total}
          </div>

          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3BE3FD]" />
              <span>{active} — Успешно</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0052FF]" />
              <span>{disabled} — Ошибки</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
