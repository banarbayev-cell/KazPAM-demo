import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement } from "chart.js";

// register chart elements
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement);

export default function MiniSecretActivityChart() {
  const data = {
    labels: ["", "", "", "", "", "", "", ""],
    datasets: [
      {
        data: [2, 5, 4, 9, 6, 12, 14, 18],
        borderColor: "#0052FF",
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false, grid: { display: false } },
      y: { display: false, grid: { display: false } },
    },
  };

  return (
    <div className="w-full h-[120px]">
      <Line data={data} options={options} />
    </div>
  );
}
