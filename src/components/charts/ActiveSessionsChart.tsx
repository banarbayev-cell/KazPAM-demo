import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { time: "00:00", sessions: 2 },
  { time: "03:00", sessions: 4 },
  { time: "06:00", sessions: 1 },
  { time: "09:00", sessions: 6 },
  { time: "12:00", sessions: 10 },
  { time: "15:00", sessions: 8 },
  { time: "18:00", sessions: 12 },
  { time: "21:00", sessions: 4 },
];

export default function ActiveSessionsChart() {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="time" stroke="#C9D1E7" />
          <YAxis stroke="#C9D1E7" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#121A33",
              borderRadius: "8px",
              border: "1px solid #1E2A45",
            }}
            labelStyle={{ color: "#C9D1E7" }}
            itemStyle={{ color: "#3BE3FD" }}
          />
          <Line type="monotone" dataKey="sessions" stroke="#3BE3FD" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
