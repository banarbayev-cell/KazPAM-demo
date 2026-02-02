import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/ui/sidebar";
import { fetchRecordings, Recording } from "../api/recordings";

export default function Recordings() {
  const [search, setSearch] = useState("");
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchRecordings()
      .then(setRecordings)
      .finally(() => setLoading(false));
  }, []);

  const filtered = recordings.filter(
    (r) =>
      r.user.toLowerCase().includes(search.toLowerCase()) ||
      r.protocol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-8">
          <h1 className="text-3xl font-bold mb-6">Записи сессий</h1>

          <input
            type="text"
            placeholder="Поиск по пользователю или протоколу"
            className="w-full mb-4 p-2 border rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <p className="text-gray-500">Загрузка...</p>
          ) : (
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
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{r.user}</td>
                    <td className="p-3">{r.protocol}</td>
                    <td className="p-3">{r.date}</td>
                    <td className="p-3">{Math.floor(r.duration / 60)} мин</td>
                    <td className="p-3">
                      {r.size ? `${Math.round(r.size / 1024 / 1024)} MB` : "-"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          r.status === "READY"
                            ? "bg-green-200 text-green-900"
                            : "bg-yellow-200 text-yellow-900"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.status === "READY" && (
                        <button
                          onClick={() =>
                            navigate(`/recordings/${r.id}`)
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm"
                        >
                          Просмотреть
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      </div>
    </div>
  );
}
