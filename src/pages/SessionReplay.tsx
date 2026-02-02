import { Play, Pause } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchRecordingEvents,
  RecordingEvent,
} from "../api/recordings";

export default function SessionReplay() {
  const { id } = useParams();
  const recordingId = Number(id);

  const [events, setEvents] = useState<RecordingEvent[]>([]);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    fetchRecordingEvents(recordingId).then((data) => {
      setEvents(data.events);
      setCursor(0);
    });
  }, [recordingId]);

  useEffect(() => {
    if (!playing) return;

    const timer = setInterval(() => {
      setCursor((c) => (c < events.length - 1 ? c + 1 : c));
    }, 800);

    return () => clearInterval(timer);
  }, [playing, events.length]);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Воспроизведение сессии</h1>

      <div className="bg-black text-green-400 p-6 rounded-xl h-96 overflow-y-auto font-mono shadow">
        {events.slice(0, cursor + 1).map((e, i) => (
          <div key={i} className="py-1">
            {e.ts} — {e.text}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setPlaying(!playing)}
          className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {playing ? <Pause /> : <Play />}
        </button>

        <span className="text-gray-600">
          {cursor + 1} / {events.length}
        </span>
      </div>
    </div>
  );
}
