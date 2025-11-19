import { Eye, CircleDot, Ban, Shield, Briefcase, Activity } from "lucide-react";

const users = [
  { username: "admin", role: "SuperAdmin", status: "Active", lastLogin: "Сегодня 12:43" },
  { username: "db_readonly", role: "ReadOnly", status: "Disabled", lastLogin: "Вчера 18:55" },
  { username: "audit_operator", role: "Auditor", status: "Active", lastLogin: "15.11.2025 09:12" },
  { username: "devops_build", role: "DevOps", status: "Active", lastLogin: "14.11.2025 11:22" },
  { username: "dlp_control", role: "DLP", status: "Active", lastLogin: "13.11.2025 16:08" },
  { username: "soc_analyst", role: "SOC Analyst", status: "Active", lastLogin: "12.11.2025 19:41" },
];

const roleBadge = (role: string) => {
  switch (role) {
    case "SuperAdmin":
      return <span className="px-3 py-1 bg-red-600 text-white rounded-lg">SuperAdmin</span>;
    case "Auditor":
      return <span className="px-3 py-1 bg-purple-600 text-white rounded-lg">Auditor</span>;
    case "ReadOnly":
      return <span className="px-3 py-1 bg-yellow-500 text-white rounded-lg">ReadOnly</span>;
    case "DevOps":
      return <span className="px-3 py-1 bg-green-600 text-white rounded-lg">DevOps</span>;
    case "DLP":
      return <span className="px-3 py-1 bg-blue-600 text-white rounded-lg">DLP</span>;
    case "SOC Analyst":
      return <span className="px-3 py-1 bg-gray-700 text-white rounded-lg">SOC Analyst</span>;
    default:
      return <span className="px-3 py-1 bg-gray-400 text-white rounded-lg">{role}</span>;
  }
};

export default function Users() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Пользователи системы</h1>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-3 font-semibold text-gray-600">Имя пользователя</th>
              <th className="py-3 font-semibold text-gray-600">Роль</th>
              <th className="py-3 font-semibold text-gray-600">Статус</th>
              <th className="py-3 font-semibold text-gray-600">Последний вход</th>
              <th className="py-3 font-semibold text-gray-600 text-center">Действия</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user, index) => (
              <tr key={index} className="border-b hover:bg-gray-50 transition">
                <td className="py-4">{user.username}</td>
                <td className="py-4">{roleBadge(user.role)}</td>
                <td className="py-4">
                  {user.status === "Active" ? (
                    <span className="text-green-600 font-semibold">Активен</span>
                  ) : (
                    <span className="text-red-600 font-semibold">Отключён</span>
                  )}
                </td>

                <td className="py-4">{user.lastLogin}</td>

                <td className="py-4">
                  <div className="flex justify-center gap-4 text-gray-700">
                    <button className="hover:text-blue-600 transition" title="Просмотр">
                      <Eye size={22} />
                    </button>
                    <button className="hover:text-green-600 transition" title="Запись сессии">
                      <CircleDot size={22} />
                    </button>
                    <button className="hover:text-red-600 transition" title="Заблокировать аккаунт">
                      <Ban size={22} />
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
