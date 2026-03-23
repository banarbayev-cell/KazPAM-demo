import { Play, Pause } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/ui/sidebar";
import {
  fetchRecordingEvents,
  fetchRecordingMeta,
  RecordingEvent,
  RecordingMeta,
} from "../api/recordings";

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "—";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs}ч ${mins}м ${secs}с`;
  if (mins > 0) return `${mins}м ${secs}с`;
  return `${secs}с`;
}

function getStatusClass(status?: string) {
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

function getEventTypeClass(type?: string) {
  switch (type) {
    case "command":
      return "text-cyan-400";
    case "auth":
      return "text-green-400";
    case "alert":
      return "text-red-400";
    case "file":
      return "text-purple-400";
    default:
      return "text-gray-300";
  }
}

export default function SessionReplay() {
  const navigate = useNavigate();
  const { id } = useParams();
  const recordingId = Number(id);

  const [meta, setMeta] = useState<RecordingMeta | null>(null);
  const [events, setEvents] = useState<RecordingEvent[]>([]);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const consoleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!recordingId || Number.isNaN(recordingId)) {
      setError("Некорректный ID записи");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    Promise.all([
      fetchRecordingMeta(recordingId),
      fetchRecordingEvents(recordingId),
    ])
      .then(([metaData, eventsData]) => {
        setMeta(metaData);
        setEvents(eventsData.events || []);
        setCursor(0);
        setPlaying(false);
      })
      .catch(() => {
        setError("Не удалось загрузить replay сессии");
      })
      .finally(() => setLoading(false));
  }, [recordingId]);

  useEffect(() => {
    if (!playing || events.length === 0) return;

    const delay = Math.max(150, 800 / speed);

    const timer = setInterval(() => {
      setCursor((prev) => {
        if (prev >= events.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay);

    return () => clearInterval(timer);
  }, [playing, speed, events.length]);

  useEffect(() => {
    if (!consoleRef.current) return;
    consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [cursor]);

  const visibleEvents = useMemo(() => {
    if (events.length === 0) return [];
    return events.slice(0, cursor + 1);
  }, [events, cursor]);

  const currentEvent = events[cursor] ?? null;

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-8 overflow-y-auto">
          <div className="bg-[#EDEEF2] rounded p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Replay сессии
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Просмотр событий записанной привилегированной сессии
                </p>
              </div>

              <button
                onClick={() => navigate("/recordings")}
                className="px-4 py-2 bg-[#0052FF] hover:bg-blue-700 text-white rounded"
              >
                Назад
              </button>
            </div>

            {loading ? (
              <div className="bg-[#121A33] text-white rounded-xl p-6">
                Загрузка replay...
              </div>
            ) : error ? (
              <div className="bg-[#121A33] text-red-300 rounded-xl p-6 border border-red-500/30">
                {error}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-[#121A33] rounded-xl p-6 text-white">
                    <h2 className="text-lg font-semibold mb-4">
                      Информация о записи
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400 mb-1">Пользователь</div>
                        <div>{meta?.user || "—"}</div>
                      </div>

                      <div>
                        <div className="text-gray-400 mb-1">Протокол</div>
                        <div className="uppercase">{meta?.protocol || "—"}</div>
                      </div>

                      <div>
                        <div className="text-gray-400 mb-1">Начало</div>
                        <div>{meta?.start_time || "—"}</div>
                      </div>

                      <div>
                        <div className="text-gray-400 mb-1">Окончание</div>
                        <div>{meta?.end_time || "—"}</div>
                      </div>

                      <div>
                        <div className="text-gray-400 mb-1">Длительность</div>
                        <div>{formatDuration(meta?.duration)}</div>
                      </div>

                      <div>
                        <div className="text-gray-400 mb-1">Статус</div>
                        <span
                          className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold ${getStatusClass(
                            meta?.status
                          )}`}
                        >
                          {meta?.status || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#121A33] rounded-xl p-6 text-white">
                    <h2 className="text-lg font-semibold mb-4">
                      Текущее событие
                    </h2>

                    {currentEvent ? (
                      <div className="space-y-4 text-sm">
                        <div>
                          <div className="text-gray-400 mb-1">Время</div>
                          <div>{currentEvent.ts}</div>
                        </div>

                        <div>
                          <div className="text-gray-400 mb-1">Тип</div>
                          <div className={getEventTypeClass(currentEvent.type)}>
                            {currentEvent.type}
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-400 mb-1">Содержимое</div>
                          <div className="break-all">{currentEvent.text}</div>
                        </div>

                        <div>
                          <div className="text-gray-400 mb-1">Позиция</div>
                          <div>
                            {events.length === 0
                              ? "0 / 0"
                              : `${cursor + 1} / ${events.length}`}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        События отсутствуют
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#121A33] rounded-xl p-6 text-white">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <button
                      onClick={() => setPlaying(!playing)}
                      disabled={events.length === 0}
                      className="p-3 bg-[#0052FF] text-white rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      {playing ? <Pause size={18} /> : <Play size={18} />}
                    </button>

                    <button
                      onClick={() => {
                        setPlaying(false);
                        setCursor(0);
                      }}
                      className="px-4 py-2 bg-[#1A243F] text-white rounded hover:bg-[#223055]"
                    >
                      В начало
                    </button>

                    <button
                      onClick={() => {
                        setPlaying(false);
                        setCursor((prev) => Math.max(prev - 1, 0));
                      }}
                      className="px-4 py-2 bg-[#1A243F] text-white rounded hover:bg-[#223055]"
                    >
                      Назад
                    </button>

                    <button
                      onClick={() => {
                        setPlaying(false);
                        setCursor((prev) =>
                          Math.min(prev + 1, Math.max(events.length - 1, 0))
                        );
                      }}
                      className="px-4 py-2 bg-[#1A243F] text-white rounded hover:bg-[#223055]"
                    >
                      Вперёд
                    </button>

                    <select
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="px-3 py-2 bg-[#1A243F] text-white rounded border border-[#2B3655] outline-none"
                    >
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={4}>4x</option>
                    </select>

                    <div className="text-sm text-gray-300 ml-auto">
                      {events.length === 0
                        ? "0 / 0"
                        : `${cursor + 1} / ${events.length}`}
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={Math.max(events.length - 1, 0)}
                    value={Math.min(cursor, Math.max(events.length - 1, 0))}
                    onChange={(e) => {
                      setPlaying(false);
                      setCursor(Number(e.target.value));
                    }}
                    className="w-full accent-[#0052FF]"
                  />
                </div>

                <div className="bg-[#121A33] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 bg-[#1A243F] text-gray-200 font-semibold">
                    Replay Console
                  </div>

                  <div
                    ref={consoleRef}
                    className="h-[420px] overflow-y-auto bg-[#0E1A3A] text-green-400 font-mono text-sm"
                  >
                    {visibleEvents.length === 0 ? (
                      <div className="p-6 text-gray-400">
                        Нет событий для воспроизведения
                      </div>
                    ) : (
                      visibleEvents.map((e, i) => (
                        <div
                          key={`${e.ts}-${i}`}
                          className="px-6 py-3 border-t border-[#24304F] hover:bg-[#0A0F24] transition"
                        >
                          <span className="text-gray-400">[{e.ts}]</span>{" "}
                          <span className={getEventTypeClass(e.type)}>
                            {e.type}
                          </span>{" "}
                          <span>{e.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}