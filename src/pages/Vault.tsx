import { Eye, RotateCcw, ClipboardCopy, Ban } from "lucide-react";

const vaultItems = [
  { account: "root", system: "Linux-Server-01", type: "Local Account", lastRotation: "Сегодня 09:20", status: "Protected" },
  { account: "domain_admin", system: "AD-DC01", type: "Domain Admin", lastRotation: "Вчера 18:12", status: "Scheduled" },
  { account: "sysdba", system: "Oracle-DB-PROD", type: "DBA Account", lastRotation: "17.11.2025 10:44", status: "Protected" },
  { account: "enable_mode", system: "Cisco-ASA-FW", type: "Network Admin", lastRotation: "Сегодня 07:30", status: "Protected" },
  { account: "root", system: "Solaris-CoreBank", type: "Privileged", lastRotation: "15.11.2025 22:11", status: "Protected" },
  { account: "administrator", system: "Windows-RDP01", type: "RDP Access", lastRotation: "Сегодня 06:51", status: "Protected" },
];

export default function Vault() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Vault — Хранилище привилегированных паролей</h1>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-3 font-semibold text-gray-600">Аккаунт</th>
              <th className="py-3 font-semibold text-gray-600">Система</th>
              <th className="py-3 font-semibold text-gray-600">Тип доступа</th>
              <th className="py-3 font-semibold text-gray-600">Rotation</th>
              <th className="py-3 font-semibold text-gray-600">Статус</th>
              <th className="py-3 font-semibold text-gray-600 text-center">Действия</th>
            </tr>
          </thead>

          <tbody>
            {vaultItems.map((item, index) => (
              <tr key={index} className="border-b hover:bg-gray-50 transition">
                <td className="py-4">{item.account}</td>
                <td className="py-4">{item.system}</td>
                <td className="py-4">{item.type}</td>
                <td className="py-4">{item.lastRotation}</td>
                <td className="py-4">
                  <span className="text-blue-600 font-semibold">{item.status}</span>
                </td>

                <td className="py-4">
                  <div className="flex justify-center gap-4 text-gray-700">
                    <button className="hover:text-blue-600 transition" title="Просмотр пароля">
                      <Eye size={22} />
                    </button>
                    <button className="hover:text-green-600 transition" title="Password Rotation">
                      <RotateCcw size={22} />
                    </button>
                    <button className="hover:text-yellow-600 transition" title="Copy to Clipboard">
                      <ClipboardCopy size={22} />
                    </button>
                    <button className="hover:text-red-600 transition" title="Отключить">
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
