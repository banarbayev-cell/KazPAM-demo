import { useState } from "react";

interface AuditEvent {
  time: string;
  user: string;
  action: string;
  policy: string;
  status: "success" | "failed";
}

export default function Audit() {
  const [auditEvents] = useState<AuditEvent[]>([
    { time: "12:01", user: "admin", action: "Вход в систему", policy: "Access Control", status: "success" },
    { time: "12:04", user: "operator01", action: "Попытка удалить политику", policy: "Change Control", status: "failed" },
    { time: "12:07", user: "root", action: "Запуск сессии", policy: "Session Monitor", status: "success" },
  ]);

  return (
    <div className="w-full min-h-screen bg-[#F4F6FA] px-8 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Аудит событий</h1>

      <div className="table-container animate-fadeIn">
        <table className="k-table">
          <thead>
            <tr>
              <th className="k-th">Время</th>
              <th className="k-th">Пользователь</th>
              <th className="k-th">Событие</th>
              <th className="k-th">Политика</th>
              <th className="k-th">Статус</th>
            </tr>
          </thead>
          <tbody>
            {auditEvents.map((evt, index) => (
              <tr key={index}>
                <td className="k-td">{evt.time}</td>
                <td className="k-td">{evt.user}</td>
                <td className="k-td">{evt.action}</td>
                <td className="k-td">{evt.policy}</td>
                <td className="k-td">
                  <span className={evt.status === "success" ? "chip-active" : "chip-disabled"}>
                    {evt.status === "success" ? "Успешно" : "Отклонено"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
