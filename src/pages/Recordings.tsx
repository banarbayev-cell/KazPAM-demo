import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/ui/sidebar";
import { fetchRecordings, Recording } from "../api/recordings";

function formatDuration(seconds: number, status: Recording["status"]) {
  if (status === "PROCESSING" && (!seconds || seconds <= 0)) {
    return "Обрабатывается";
  }

  if (!seconds || seconds <= 0) return "—";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs}ч ${mins}м ${secs}с`;
  if (mins > 0) return `${mins}м ${secs}с`;
  return `${secs}с`;
}

function formatSize(size: number | null, status: Recording["status"]) {
  if ((size === null || size === undefined) && status === "PROCESSING") {
    return "Считается";
  }

  if (size === null || size === undefined) return "—";
  if (size === 0) return "0 KB";

  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
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
  const [statusFilter, setStatusFilter] = useState<"ALL" | Recording["status"]>("ALL");
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const loadRecordings = () => {
    setLoading(true);
    setError("");

    fetchRecordings()
      .then((data) => {
        setRecordings(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load recordings:", err);
        setRecordings([]);
        setError("Не удалось загрузить записи сессий");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    const hasProcessing = recordings.some((r) => r.status === "PROCESSING");
    if (!hasProcessing) return;

    const t = setInterval(() => {
      loadRecordings();
    }, 10000);

    return () => clearInterval(t);
  }, [recordings]);

  const filtered = useMemo<Recording[]>(() => {
    const safeRecordings = Array.isArray(recordings) ? recordings : [];
    const q = search.trim().toLowerCase();

    return safeRecordings.filter((r) => {
      const matchesStatus = statusFilter === "ALL" ? true : r.status === statusFilter;
      const matchesSearch =
        !q ||
        String(r.user ?? "").toLowerCase().includes(q) ||
        String(r.protocol ?? "").toLowerCase().includes(q) ||
        String(r.date ?? "").toLowerCase().includes(q) ||
        String(r.status ?? "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [recordings, search, statusFilter]);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-8 overflow-y-auto">
          <div className="bg-[#EDEEF2] rounded p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Записи сессий</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Replay-каталог с живым статусом, длительностью и размером
                </p>
              </div>

              <button
                onClick={loadRecordings}
                className="px-4 py-2 rounded bg-[#0052FF] hover:bg-[#0046D8] text-white"
              >
                Обновить
              </button>
            </div>

            <div className="flex gap-3 items-center mb-4">
              <input
                type="text"
                placeholder="Поиск по пользователю или протоколу"
                className="flex-1 p-3 border border-gray-300 rounded bg-white text-gray-900"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "ALL" | Recording["status"])
                }
                className="p-3 border border-gray-300 rounded bg-white text-gray-900"
              >
                <option value="ALL">Все статусы</option>
                <option value="READY">READY</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>

            {loading ? (
              <div className="bg-[#121A33] text-white rounded-xl p-6">
                Загрузка...
              </div>
            ) : error ? (
              <div className="bg-[#121A33] text-red-300 rounded-xl p-6 border border-red-500/30">
                {error}
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
                        <td className="p-4">{formatDuration(r.duration, r.status)}</td>
                        <td className="p-4">{formatSize(r.size, r.status)}</td>
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
                          {(r.status === "READY" || r.status === "PROCESSING") ? (
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