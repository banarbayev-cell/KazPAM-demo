import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/ui/sidebar";


export default function Recordings() {
  const [search, setSearch] = useState("");

  const recordings = [
    {
      user: "Администратор",
      date: "2025-11-20 14:10",
      duration: "12 мин",
      protocol: "SSH",
      status: "Доступна",
      size: "28 MB",
    },
    {
      user: "Иван Петров",
      date: "2025-11-19 16:45",
      duration: "21 мин",
      protocol: "RDP",
      status: "Обрабатывается",
      size: "-",
    },
    {
      user: "Алия Нурлан",
      date: "2025-11-19 11:22",
      duration: "9 мин",
      protocol: "SQL",
      status: "Доступна",
      size: "14 MB",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-8">
          <h1 className="text-3xl font-bold mb-6">Записи сессий</h1>

          <input
            type="text"
            placeholder="Поиск..."
            className="w-full mb-4 p-2 border rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <table className="w-full bg-white rounded-lg shadow">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 text-left">Пользователь</th>
                <th className="p-3 text-left">Протокол</th>
                <th className="p-3 text-left">Дата</th>
                <th className="p-3 text-left">Длительность</th>
                <th className="p-3 text-left">Размер</th>
                <th className="p-3 text-left">Статус</th>
                <th className="p-3 text-left">Действия</th>
              </tr>
            </thead>

            <tbody>
              {recordings.map((r, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="p-3">{r.user}</td>
                  <td className="p-3">{r.protocol}</td>
                  <td className="p-3">{r.date}</td>
                  <td className="p-3">{r.duration}</td>
                  <td className="p-3">{r.size}</td>
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        r.status === "Доступна"
                          ? "bg-green-200 text-green-900"
                          : "bg-yellow-200 text-yellow-900"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 flex space-x-2">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm">
                      Просмотреть
                    </button>
                    {r.status === "Доступна" && (
                      <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm">
                        Скачать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}
