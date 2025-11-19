const events = [
  { time: "Сегодня 12:44", user: "admin", action: "Начал сессию", target: "Linux-Server-01", ip: "192.168.1.10", status: "OK" },
  { time: "Сегодня 12:42", user: "soc_analyst", action: "Запись включена", target: "Windows-RDP01", ip: "172.16.0.22", status: "OK" },
  { time: "Сегодня 12:41", user: "audit_operator", action: "Просмотр пароля", target: "Oracle-DB-PROD", ip: "192.168.3.18", status: "ALERT" },
  { time: "Сегодня 11:59", user: "root", action: "Получен root доступ", target: "Solaris-CoreBank", ip: "10.10.10.4", status: "OK" },
  { time: "Сегодня 11:50", user: "domain_admin", action: "Password Rotation", target: "AD-DC01", ip: "192.168.1.12", status: "OK" },
  { time: "Сегодня 10:15", user: "dlp_control", action: "Попытка отключения", target: "Cisco-ASA-FW", ip: "172.18.5.2", status: "BLOCKED" },
];

export default function Audit() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Audit Log — Журнал безопасности</h1>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-3 font-semibold text-gray-600">Время</th>
              <th className="py-3 font-semibold text-gray-600">Пользователь</th>
              <th className="py-3 font-semibold text-gray-600">Событие</th>
              <th className="py-3 font-semibold text-gray-600">Цель</th>
              <th className="py-3 font-semibold text-gray-600">IP</th>
              <th className="py-3 font-semibold text-gray-600">Статус</th>
            </tr>
          </thead>

          <tbody>
            {events.map((e, i) => (
              <tr key={i} className="border-b hover:bg-gray-50 transition">
                <td className="py-4">{e.time}</td>
                <td className="py-4">{e.user}</td>
                <td className="py-4">{e.action}</td>
                <td className="py-4">{e.target}</td>
                <td className="py-4">{e.ip}</td>
                <td className="py-4">
                  {e.status === "OK" && <span className="text-green-600 font-semibold">OK</span>}
                  {e.status === "ALERT" && <span className="text-yellow-600 font-semibold">ALERT</span>}
                  {e.status === "BLOCKED" && <span className="text-red-600 font-semibold">BLOCKED</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
