import { Eye, CircleDot, StopCircle } from "lucide-react";

const sessions = [
  { user: "admin", system: "Linux-Server-01", ip: "192.168.1.10", start: "12:43", status: "Active" },
  { user: "audit_operator", system: "Solaris-CoreBank", ip: "10.10.10.4", start: "11:55", status: "Active" },
  { user: "soc_analyst", system: "Windows-RDP01", ip: "172.16.0.22", start: "10:12", status: "Recording" },
  { user: "dlp_control", system: "Oracle-DB-PROD", ip: "192.168.3.18", start: "09:44", status: "Active" },
  { user: "devops_build", system: "Kubernetes-Master", ip: "10.0.50.11", start: "11:01", status: "Recording" },
  { user: "net_admin", system: "Cisco-ASA-FW", ip: "172.18.5.2", start: "13:01", status: "Active" },
  { user: "dev_team", system: "VMware-ESXi-Node3", ip: "192.168.100.55", start: "12:29", status: "Active" },
  { user: "backup_user", system: "Veeam-Backup", ip: "192.168.22.42", start: "08:18", status: "Recording" },
  { user: "operator01", system: "Solaris-ProdBank", ip: "10.15.10.9", start: "10:11", status: "Active" },
  { user: "read_only", system: "Reporting-Server", ip: "192.168.1.200", start: "07:28", status: "Active" },
];

export default function Sessions() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Активные сессии</h1>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-3 font-semibold text-gray-600">Пользователь</th>
              <th className="py-3 font-semibold text-gray-600">Система</th>
              <th className="py-3 font-semibold text-gray-600">IP адрес</th>
              <th className="py-3 font-semibold text-gray-600">Начало</th>
              <th className="py-3 font-semibold text-gray-600">Статус</th>
              <th className="py-3 font-semibold text-gray-600 text-center">Действия</th>
            </tr>
          </thead>

          <tbody>
            {sessions.map((s, index) => (
              <tr key={index} className="border-b hover:bg-gray-50 transition">
                <td className="py-4">{s.user}</td>
                <td className="py-4">{s.system}</td>
                <td className="py-4">{s.ip}</td>
                <td className="py-4">{s.start}</td>
                <td className="py-4">
                  {s.status === "Active" ? (
                    <span className="text-blue-600 font-semibold">Active</span>
                  ) : (
                    <span className="text-green-600 font-semibold">Recording</span>
                  )}
                </td>

                <td className="py-4">
                  <div className="flex justify-center gap-4">
                    <button className="hover:text-blue-600 transition" title="Просмотр">
                      <Eye size={22} />
                    </button>
                    <button className="hover:text-green-600 transition" title="Начать запись">
                      <CircleDot size={22} />
                    </button>
                    <button className="hover:text-red-600 transition" title="Завершить сессию">
                      <StopCircle size={22} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
