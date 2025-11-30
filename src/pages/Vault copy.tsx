import React, { useState } from "react";
import { FaWindows, FaLinux, FaAws, FaGitlab, FaServer } from "react-icons/fa";
import { SiCisco, SiMysql, SiPostgresql } from "react-icons/si";

import MFAConfirmModal from "../components/modals/MFAConfirmModal";

export default function Vault() {
  const [openMFA, setOpenMFA] = useState(false);

  return (
    <div className="w-full min-h-screen bg-[#F4F6FA] px-8 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Хранилище привилегий (Vault)
      </h1>

      <p className="text-gray-600 mb-6 text-lg">
        Централизованное безопасное хранилище для паролей, SSH-ключей, root-доступов,
        токенов, секретов API, сертификатов и ключей шифрования.
        Предназначено для контроля доступа к критически важным ресурсам.
      </p>

      <div className="flex justify-end mb-4">
        <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md">
          + Добавить секрет
        </button>
      </div>

      <div className="bg-white border border-gray-200 shadow-md rounded-xl overflow-hidden">
        <table className="w-full text-left text-gray-900">
          <thead className="bg-gray-100 text-gray-600 font-semibold">
            <tr>
              <th className="p-3">Система</th>
              <th className="p-3">Логин</th>
              <th className="p-3">Последнее обновление</th>
              <th className="p-3">Тип</th>
              <th className="p-3 text-center">Действие</th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-t hover:bg-gray-50 transition">
              <td className="p-3 font-medium flex items-center gap-2">
                <FaWindows className="text-blue-600" /> Windows Server 2019 Prod
              </td>
              <td className="p-3">administrator</td>
              <td className="p-3">12.11.2025</td>
              <td className="p-3">Пароль</td>
              <td className="p-3 text-center">
                <button
                  className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={() => setOpenMFA(true)}
                >
                  Показать
                </button>
              </td>
            </tr>

            <tr className="border-t hover:bg-gray-50 transition">
              <td className="p-3 font-medium flex items-center gap-2">
                <FaWindows className="text-blue-600" /> Active Directory Admin
              </td>
              <td className="p-3">corp-admin</td>
              <td className="p-3">10.11.2025</td>
              <td className="p-3">Пароль</td>
              <td className="p-3 text-center">
                <button
                  className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={() => setOpenMFA(true)}
                >
                  Показать
                </button>
              </td>
            </tr>

            <tr className="border-t hover:bg-gray-50 transition">
              <td className="p-3 font-medium flex items-center gap-2">
                <FaLinux className="text-orange-600" /> Linux Root (Ubuntu Prod)
              </td>
              <td className="p-3">root</td>
              <td className="p-3">05.11.2025</td>
              <td className="p-3">SSH ключ</td>
              <td className="p-3 text-center">
                <button
                  className="px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  onClick={() => setOpenMFA(true)}
                >
                  Скопировать
                </button>
              </td>
            </tr>

            <tr className="border-t hover:bg-gray-50 transition">
              <td className="p-3 font-medium flex items-center gap-2">
                <SiCisco className="text-red-600" /> Cisco ASA Firewall
              </td>
              <td className="p-3">enable</td>
              <td className="p-3">01.11.2025</td>
              <td className="p-3">Пароль</td>
              <td className="p-3 text-center">
                <button
                  className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={() => setOpenMFA(true)}
                >
                  Показать
                </button>
              </td>
            </tr>

            <tr className="border-t hover:bg-gray-50 transition">
              <td className="p-3 font-medium flex items-center gap-2">
                <SiPostgresql className="text-blue-700" /> PostgreSQL Cluster
              </td>
              <td className="p-3">pg-admin</td>
              <td className="p-3">20.10.2025</td>
              <td className="p-3">Пароль</td>
              <td className="p-3 text-center">
                <button
                  className="px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  onClick={() => setOpenMFA(true)}
                >
                  Скопировать
                </button>
              </td>
            </tr>

            <tr className="border-t hover:bg-gray-50 transition">
              <td className="p-3 font-medium flex items-center gap-2">
                <SiMysql className="text-blue-500" /> MySQL Backup Server
              </td>
              <td className="p-3">db-backup</td>
              <td className="p-3">17.10.2025</td>
              <td className="p-3">Пароль</td>
              <td className="p-3 text-center">
                <button
                  className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={() => setOpenMFA(true)}
                >
                  Показать
                </button>
              </td>
            </tr>

            <tr className="border-t hover:bg-gray-50 transition">
              <td className="p-3 font-medium flex items-center gap-2">
                <FaAws className="text-yellow-500" /> AWS Console Root
              </td>
              <td className="p-3">aws-root</td>
              <td className="p-3">25.09.2025</td>
              <td className="p-3">Access Keys</td>
              <td className="p-3 text-center">
                <button
                  className="px-4 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  onClick={() => setOpenMFA(true)}
                >
                  Скачать
                </button>
              </td>
            </tr>

            <tr className="border-t hover:bg-gray-50 transition">
              <td className="p-3 font-medium flex items-center gap-2">
                <FaServer className="text-orange-600" /> Solaris Root
              </td>
              <td className="p-3">root</td>
              <td className="p-3">21.09.2025</td>
              <td className="p-3">SSH ключ</td>
              <td className="p-3 text-center">
                <button
                  className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={() => setOpenMFA(true)}
                >
                  Показать
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <MFAConfirmModal
        open={openMFA}
        onClose={() => setOpenMFA(false)}
        onSuccess={() => alert("🔓 Секрет разблокирован! (позже сделаем popup с данными)")}
      />
    </div>
  );
}