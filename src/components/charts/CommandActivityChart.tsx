import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer
} from "recharts";

export default function CommandActivityChart() {
  const [data, setData] = useState([
    { time: 1, value: 2 },
    { time: 2, value: 3 },
    { time: 3, value: 4 },
    { time: 4, value: 4 },
    { time: 5, value: 5 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const nextValue = Math.max(0, prev[prev.length - 1].value + (Math.random() > 0.5 ? 1 : -1));
        const updated = [...prev.slice(1), { time: prev[prev.length - 1].time + 1, value: nextValue }];
        return updated;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3BE3FD"
          strokeWidth={3}
          dot={false}
        />
        <XAxis dataKey="time" hide />
        <YAxis hide />
      </LineChart>
    </ResponsiveContainer>
  );
}
