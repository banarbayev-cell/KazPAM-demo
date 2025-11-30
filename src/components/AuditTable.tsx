const auditDemoData = [
  { time: "19:32", user: "admin", action: "Успешный вход", policy: "MFA", status: "success" },
  { time: "19:29", user: "operator01", action: "Отказ доступа", policy: "Access Control", status: "denied" },
  { time: "19:27", user: "root", action: "Команда sudo", policy: "Session Recording", status: "recorded" },
  { time: "19:24", user: "audit", action: "Просмотр логов", policy: "RBAC", status: "success" },
];

export default function AuditTable() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-xl mt-6">
      <h2 className="text-lg font-semibold mb-4 text-[var(--text-secondary)]">
        Последние события аудита
      </h2>

      <table className="w-full text-sm">
        <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
          <tr>
            <th className="text-left py-2 px-2">Время</th>
            <th className="text-left py-2 px-2">Пользователь</th>
            <th className="text-left py-2 px-2">Событие</th>
            <th className="text-left py-2 px-2">Политика</th>
            <th className="text-left py-2 px-2">Статус</th>
          </tr>
        </thead>
        <tbody>
          {auditDemoData.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)] hover:bg-[#0E1A3A]">
              <td className="py-2 px-2">{row.time}</td>
              <td className="py-2 px-2">{row.user}</td>
              <td className="py-2 px-2">{row.action}</td>
              <td className="py-2 px-2">{row.policy}</td>
              <td
                className={`py-2 px-2 font-semibold ${
                  row.status === "success"
                    ? "text-green-400"
                    : row.status === "denied"
                    ? "text-red-400"
                    : "text-[var(--neon)]"
                }`}
              >
                {row.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
