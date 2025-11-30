import { useState } from "react";

interface Session {
  user: string;
  start: string;
  status: string;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([
    { user: "admin", start: "20:10", status: "active" },
    { user: "security", start: "20:15", status: "active" },
    { user: "operator01", start: "20:20", status: "active" },
  ]);

  const endSession = (index: number) => {
    const updated = [...sessions];
    updated[index].status = "closed";
    setSessions(updated);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Активные сессии</h1>

      <div className="bg-[#121A33] rounded-xl shadow-lg p-4 animate-fadeIn">
        <table className="min-w-full k-table">
          <thead>
            <tr className="text-left border-b border-[#1E2A45] text-[#C9D1E7]">
              <th className="py-3 px-4">Пользователь</th>
              <th className="py-3 px-4">Время начала</th>
              <th className="py-3 px-4">Статус</th>
              <th className="py-3 px-4">Действие</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, index) => (
              <tr key={index} className="border-b border-[#1E2A45] hover:bg-[#0F162E] transition">
                <td className="py-3 px-4 text-white">{s.user}</td>
                <td className="py-3 px-4 text-[#C9D1E7]">{s.start}</td>
                <td className="py-3 px-4">
                  {s.status === "active" ? (
                    <span className="px-3 py-1 text-xs rounded-full bg-green-600 text-white">
                      Активная
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs rounded-full bg-red-600 text-white">
                      Завершена
                    </span>
                  )}
                </td>

                <td className="py-3 px-4">
                  {s.status === "active" && (
                    <button
                      onClick={() => endSession(index)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
                    >
                      Завершить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
