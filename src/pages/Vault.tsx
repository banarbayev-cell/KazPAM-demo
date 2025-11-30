import { useState } from "react";
import { FaWindows, FaLinux, FaAws, FaServer } from "react-icons/fa";
import { SiCisco, SiMysql, SiPostgresql } from "react-icons/si";

import MFAConfirmModal from "../components/modals/MFAConfirmModal";

interface SecretRecord {
  system: string;
  icon: JSX.Element;
  login: string;
  updated: string;
  type: string;
}

export default function Vault() {
  const [openMFA, setOpenMFA] = useState(false);
  const [selectedSecret, setSelectedSecret] = useState<string | null>(null);

  const secrets: SecretRecord[] = [
    {
      system: "Windows Server 2019 Prod",
      icon: <FaWindows className="text-blue-600" />,
      login: "administrator",
      updated: "12.11.2025",
      type: "Пароль",
    },
    {
      system: "Active Directory Admin",
      icon: <FaWindows className="text-blue-700" />,
      login: "corp-admin",
      updated: "10.11.2025",
      type: "Пароль",
    },
    {
      system: "Linux Root (Ubuntu Prod)",
      icon: <FaLinux className="text-orange-600" />,
      login: "root",
      updated: "05.11.2025",
      type: "SSH ключ",
    },
    {
      system: "Cisco ASA Firewall",
      icon: <SiCisco className="text-red-600" />,
      login: "enable",
      updated: "01.11.2025",
      type: "Пароль",
    },
    {
      system: "PostgreSQL Cluster",
      icon: <SiPostgresql className="text-blue-800" />,
      login: "pg-admin",
      updated: "20.10.2025",
      type: "Пароль",
    },
    {
      system: "MySQL Backup Server",
      icon: <SiMysql className="text-blue-500" />,
      login: "db-backup",
      updated: "17.10.2025",
      type: "Пароль",
    },
    {
      system: "AWS Console Root",
      icon: <FaAws className="text-yellow-500" />,
      login: "aws-root",
      updated: "25.09.2025",
      type: "Access Keys",
    },
    {
      system: "Solaris Root",
      icon: <FaServer className="text-orange-600" />,
      login: "root",
      updated: "21.09.2025",
      type: "SSH ключ",
    },
  ];

  const handleAction = (secret: string) => {
    setSelectedSecret(secret);
    setOpenMFA(true);
  };

  return (
    <div className="min-h-screen w-full bg-white p-8 text-black">
      <h1 className="text-3xl font-bold mb-2">Хранилище привилегий (Vault)</h1>

      <p className="text-gray-600 mb-6 text-lg">
        Централизованное безопасное хранилище для паролей, SSH-ключей, root-доступов и токенов API.
      </p>

      <div className="flex justify-between mb-4">
        <div className="text-gray-700 font-medium">
          Количество секретов: <span className="font-bold">{secrets.length}</span>
        </div>

        <button className="k-btn-primary">+ Добавить секрет</button>
      </div>

      <div className="table-container animate-fadeIn">
        <table className="k-table">
          <thead>
            <tr>
              <th className="k-th">Система</th>
              <th className="k-th">Логин</th>
              <th className="k-th">Последнее обновление</th>
              <th className="k-th">Тип</th>
              <th className="k-th text-center">Действие</th>
            </tr>
          </thead>

          <tbody>
            {secrets.map((item, index) => (
              <tr className="k-tr" key={index}>
                <td className="k-td flex items-center gap-2">
                  {item.icon} {item.system}
                </td>
                <td className="k-td">{item.login}</td>
                <td className="k-td">{item.updated}</td>
                <td className="k-td">{item.type}</td>
                <td className="k-td flex justify-center gap-2">
                  <button
                    className="k-btn-primary"
                    onClick={() => handleAction(item.system)}
                  >
                    Показать
                  </button>

                  <button
                    className="k-btn-secondary"
                    onClick={() => handleAction(item.system)}
                  >
                    Скопировать
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MFAConfirmModal
        open={openMFA}
        onClose={() => setOpenMFA(false)}
        onSuccess={() =>
          alert(`🔓 Доступ к секрету "${selectedSecret}" разблокирован!`)
        }
      />
    </div>
  );
}
