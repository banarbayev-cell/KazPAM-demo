import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/ui/sidebar";
import { fetchRecordings, Recording } from "../api/recordings";

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "—";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs}ч ${mins}м ${secs}с`;
  if (mins > 0) return `${mins}м ${secs}с`;
  return `${secs}с`;
}

function formatSize(size: number | null) {
  if (!size) return "—";

  const mb = size / 1024 / 1024;
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }

  return `${mb.toFixed(1)} MB`;
}

function getStatusClass(status: Recording["status"]) {
  switch (status) {
    case "READY":
      return "bg-green-500/20 text-green-300 border border-green-500/30";
    case "PROCESSING":
      return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
    case "FAILED":
      return "bg-red-500/20 text-red-300 border border-red-500/30";
    default:
      return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
  }
}

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return recordings;

    return recordings.filter((r) => {
      return (
        r.user.toLowerCase().includes(q) ||
        r.protocol.toLowerCase().includes(q) ||
        r.date.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    });
  }, [recordings, search]);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-8 overflow-y-auto">
          <div className="bg-[#EDEEF2] rounded p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Записи сессий
            </h1>

            <input
              type="text"
              placeholder="Поиск по пользователю или протоколу"
              className="w-full mb-4 p-3 border border-gray-300 rounded bg-white text-gray-900"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {loading ? (
              <div className="bg-[#121A33] text-white rounded-xl p-6">
                Загрузка...
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-[#121A33] text-gray-300 rounded-xl p-6">
                Записи не найдены
              </div>
            ) : (
              <div className="bg-[#121A33] rounded-2xl overflow-hidden">
                <table className="w-full text-white">
                  <thead className="bg-[#1A243F] text-left">
                    <tr>
                      <th className="p-4">Пользователь</th>
                      <th className="p-4">Протокол</th>
                      <th className="p-4">Дата</th>
                      <th className="p-4">Длительность</th>
                      <th className="p-4">Размер</th>
                      <th className="p-4">Статус</th>
                      <th className="p-4">Действия</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-[#24304F] hover:bg-[#0E1A3A] transition"
                      >
                        <td className="p-4">{r.user}</td>
                        <td className="p-4 uppercase">{r.protocol}</td>
                        <td className="p-4">{r.date}</td>
                        <td className="p-4">{formatDuration(r.duration)}</td>
                        <td className="p-4">{formatSize(r.size)}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${getStatusClass(
                              r.status
                            )}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {r.status === "READY" ? (
                            <button
                              onClick={() => navigate(`/recordings/${r.id}`)}
                              className="px-4 py-2 bg-[#0052FF] hover:bg-blue-700 text-white rounded"
                            >
                              Просмотреть
                            </button>
                          ) : (
                            <span className="text-gray-400">Недоступно</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}