export default function Records() {
  const sessions = [
    { user: "admin", ip: "10.0.0.12", time: "20.11.2025 14:11", duration: "12:33" },
    { user: "ivan", ip: "10.0.0.33", time: "19.11.2025 18:01", duration: "05:12" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Записи сессий</h1>

      <div className="bg-white rounded-xl shadow p-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-2">Пользователь</th>
              <th className="py-2">IP</th>
              <th className="py-2">Время</th>
              <th className="py-2">Длительность</th>
              <th className="py-2 text-center">Видео</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="py-2">{s.user}</td>
                <td>{s.ip}</td>
                <td>{s.time}</td>
                <td>{s.duration}</td>
                <td className="text-center">
                  ▶️
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
