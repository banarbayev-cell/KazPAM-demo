import { useState, useMemo } from "react";
import { FaWindows, FaLinux, FaAws, FaServer } from "react-icons/fa";
import { SiCisco, SiMysql, SiPostgresql } from "react-icons/si";

import MFAConfirmModal from "../components/modals/MFAConfirmModal";
import VaultHistoryPanel from "../components/panels/VaultHistoryPanel";
import CreateSecretModal from "../components/modals/CreateSecretModal";
import { Button } from "../components/ui/button";


interface SecretRecord {
  system: string;
  icon: JSX.Element;
  login: string;
  updated: string;
  type: string;
  platform: string;
}

// ------------------------------------------------------------
// ИКОНКИ ДЛЯ ПЛАТФОРМ
// ------------------------------------------------------------
const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "Windows": return <FaWindows className="text-blue-600" />;
    case "Linux": return <FaLinux className="text-orange-600" />;
    case "Cisco": return <SiCisco className="text-red-600" />;
    case "PostgreSQL": return <SiPostgresql className="text-blue-800" />;
    case "MySQL": return <SiMysql className="text-blue-500" />;
    case "AWS": return <FaAws className="text-yellow-500" />;
    case "Solaris": return <FaServer className="text-orange-600" />;
    default: return <FaServer className="text-gray-400" />;
  }
};

// ------------------------------------------------------------
// ДЕМО-ДАННЫЕ
// ------------------------------------------------------------
const initialSecrets: SecretRecord[] = [
  {
    system: "Windows Server 2019 Prod",
    icon: getPlatformIcon("Windows"),
    login: "administrator",
    updated: "12.11.2025",
    type: "Пароль",
    platform: "Windows",
  },
  {
    system: "Active Directory Admin",
    icon: getPlatformIcon("Windows"),
    login: "corp-admin",
    updated: "10.11.2025",
    type: "Пароль",
    platform: "Windows",
  },
  {
    system: "Linux Root (Ubuntu Prod)",
    icon: getPlatformIcon("Linux"),
    login: "root",
    updated: "05.11.2025",
    type: "SSH ключ",
    platform: "Linux",
  },
  {
    system: "Cisco ASA Firewall",
    icon: getPlatformIcon("Cisco"),
    login: "enable",
    updated: "01.11.2025",
    type: "Пароль",
    platform: "Cisco",
  },
  {
    system: "PostgreSQL Cluster",
    icon: getPlatformIcon("PostgreSQL"),
    login: "pg-admin",
    updated: "20.10.2025",
    type: "Пароль",
    platform: "PostgreSQL",
  },
  {
    system: "MySQL Backup Server",
    icon: getPlatformIcon("MySQL"),
    login: "db-backup",
    updated: "17.10.2025",
    type: "Пароль",
    platform: "MySQL",
  },
  {
    system: "AWS Console Root",
    icon: getPlatformIcon("AWS"),
    login: "aws-root",
    updated: "25.09.2025",
    type: "Access Keys",
    platform: "AWS",
  },
  {
    system: "Solaris Root",
    icon: getPlatformIcon("Solaris"),
    login: "root",
    updated: "21.09.2025",
    type: "SSH ключ",
    platform: "Solaris",
  },
];

export default function Vault() {
  const [secretsList, setSecretsList] = useState<SecretRecord[]>(initialSecrets);

  const [openMFA, setOpenMFA] = useState(false);
  const [selectedSecret, setSelectedSecret] = useState<string | null>(null);

  const [openHistory, setOpenHistory] = useState(false);
  const [historySecret, setHistorySecret] = useState<SecretRecord | null>(null);

  const [openCreate, setOpenCreate] = useState(false);

  // ------------------------------------------------------------
  // ФИЛЬТРЫ
  // ------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortByDate, setSortByDate] = useState("newest");

  // ------------------------------------------------------------
  // ПОИСК + ФИЛЬТРЫ + СОРТИРОВКА
  // ------------------------------------------------------------
  const filtered = useMemo(() => {
    return secretsList
      .filter((s) =>
        s.system.toLowerCase().includes(search.toLowerCase()) ||
        s.login.toLowerCase().includes(search.toLowerCase())
      )
      .filter((s) => (typeFilter === "all" ? true : s.type === typeFilter))
      .filter((s) => (platformFilter === "all" ? true : s.platform === platformFilter))
      .sort((a, b) => {
        const dateA = new Date(a.updated.split(".").reverse().join("-"));
        const dateB = new Date(b.updated.split(".").reverse().join("-"));
        return sortByDate === "newest" ? +dateB - +dateA : +dateA - +dateB;
      });
  }, [secretsList, search, typeFilter, platformFilter, sortByDate]);

  // ------------------------------------------------------------
  // ПАГИНАЦИЯ (как в Users)
  // ------------------------------------------------------------
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);

  // ------------------------------------------------------------
  // ОБРАБОТЧИКИ
  // ------------------------------------------------------------
  const handleMFA = (secret: string) => {
    setSelectedSecret(secret);
    setOpenMFA(true);
  };

  const openHistoryPanel = (secret: SecretRecord) => {
    setHistorySecret(secret);
    setOpenHistory(true);
  };

  const handleCreateSecret = (newData: any) => {
    const icon = getPlatformIcon(newData.platform);

    setSecretsList((prev) => [
      {
        system: newData.system,
        login: newData.login,
        type: newData.type,
        updated: newData.updated,
        platform: newData.platform,
        icon,
      },
      ...prev,
    ]);

    setOpenCreate(false);
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  return (
   <div className="p-6 w-full bg-white text-black min-h-screen">

      <h1 className="text-3xl font-bold mb-6">Хранилище привилегий (Vault)</h1>

      {/* Фильтры */}
      <div className="flex gap-3 items-center mb-6">

        {/* Поиск */}
        <input
          placeholder="Поиск..."
          className="w-72 bg-white text-black border p-2 rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Тип */}
        <select
          className="bg-white text-black border rounded p-2"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">Все типы</option>
          <option value="Пароль">Пароль</option>
          <option value="SSH ключ">SSH ключ</option>
          <option value="Access Keys">Access Keys</option>
          <option value="API Token">API Token</option>
        </select>

        {/* Платформа */}
        <select
          className="bg-white text-black border rounded p-2"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
        >
          <option value="all">Все платформы</option>
          <option value="Windows">Windows</option>
          <option value="Linux">Linux</option>
          <option value="Cisco">Cisco</option>
          <option value="PostgreSQL">PostgreSQL</option>
          <option value="MySQL">MySQL</option>
          <option value="AWS">AWS</option>
          <option value="Solaris">Solaris</option>
          <option value="Custom">Другое</option>
        </select>

        {/* Дата */}
        <select
          className="bg-white text-black border rounded p-2"
          value={sortByDate}
          onChange={(e) => setSortByDate(e.target.value)}
        >
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
        </select>

        <Button onClick={() => setOpenCreate(true)}>
  + Добавить секрет
</Button>

      </div>

      {/* Таблица */}
      <div className="overflow-y-auto max-h-[500px] rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33]">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left">Система</th>
              <th className="p-3 text-left">Логин</th>
              <th className="p-3 text-left">Обновлено</th>
              <th className="p-3 text-left">Тип</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>

          <tbody>
            {currentRows.map((item, index) => (
              <tr
                key={index}
                className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] transition"
              >
                <td className="p-3 flex items-center gap-2">
                  {item.icon} {item.system}
                </td>

                <td className="p-3">{item.login}</td>
                <td className="p-3">{item.updated}</td>
                <td className="p-3">{item.type}</td>

                <td className="p-3 flex gap-2">
                  <button
                    className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
                    onClick={() => handleMFA(item.system)}
                  >
                    Показать
                  </button>

                  <button
                    className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700"
                    onClick={() => handleMFA(item.system)}
                  >
                    Скопировать
                  </button>

                  <button
                    className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700"
                    onClick={() => openHistoryPanel(item)}
                  >
                    Подробнее →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      <div className="flex justify-between items-center p-4">

        {/* Кол-во строк */}
        <div className="flex items-center gap-2">
          <span>Показать:</span>
          <select
            className="border p-1 rounded text-black"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Страницы */}
        <div className="flex gap-2 items-center">
          <button
            className="px-2 text-black"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            {"<<"}
          </button>

          <button
            className="px-2 text-black"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {"<"}
          </button>

          <span className="font-medium">
            {currentPage} / {totalPages}
          </span>

          <button
            className="px-2 text-black"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            {">"}
          </button>

          <button
            className="px-2 text-black"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            {">>"}
          </button>
        </div>
      </div>

      {/* МФА */}
      <MFAConfirmModal
        open={openMFA}
        onClose={() => setOpenMFA(false)}
        onSuccess={() =>
          alert(`🔓 Доступ к секрету "${selectedSecret}" разблокирован!`)
        }
      />

      {/* История */}
      <VaultHistoryPanel
        open={openHistory}
        onClose={() => setOpenHistory(false)}
        system={historySecret?.system}
        login={historySecret?.login}
        updated={historySecret?.updated}
        type={historySecret?.type}
        history={[
          { time: "19:32", user: "admin", action: "Просмотр", ip: "192.168.1.42", status: "Успешно" },
          { time: "19:27", user: "root", action: "Изменение пароля", ip: "10.0.0.78", status: "Отклонено" },
          { time: "19:25", user: "audit", action: "Сканирование", ip: "185.22.91.14", status: "Подозрительно" },
        ]}
        onInvestigate={() => console.log("Investigate")}
        onRestrict={() => console.log("Restrict")}
      />

      {/* Создание секрета */}
      <CreateSecretModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreate={handleCreateSecret}
      />

    </div>
  );
}
