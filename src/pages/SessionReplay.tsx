import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const log = [
  { time: "12:43:01", action: "SSH login to Linux-Server-01" },
  { time: "12:43:11", action: "sudo su -" },
  { time: "12:43:15", action: "User modified /etc/sudoers" },
  { time: "12:43:18", action: "File opened: secrets.txt" },
  { time: "12:43:22", action: "Failed password attempt" },
  { time: "12:43:27", action: "Security rule triggered — ALERT" },
  { time: "12:43:40", action: "Session marked for recording" },
];

export default function SessionReplay() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Session Recording Playback</h1>

      <div className="bg-black text-green-400 p-6 rounded-xl h-96 overflow-y-auto font-mono text-lg shadow-xl">
        {log.map((entry, index) => (
          <div key={index} className="py-1">
            {entry.time} — {entry.action}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6">
        <button className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg">
          <ChevronLeft size={22} />
        </button>

        <button
          onClick={() => setPlaying(!playing)}
          className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {playing ? <Pause size={22} /> : <Play size={22} />}
        </button>

        <button className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg">
          <ChevronRight size={22} />
        </button>

        <p className="text-gray-600 ml-4 text-lg">12:43 — 12:58</p>
      </div>
    </div>
  );
}
