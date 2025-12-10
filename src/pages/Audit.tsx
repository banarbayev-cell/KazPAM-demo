import { useState, useMemo, useEffect } from "react"; // ⬅ добавлен useEffect
import { Input } from "../components/ui/input";
import ActionMenuAudit from "../components/ActionMenuAudit";
import PolicyPieChart from "../components/charts/PolicyPieChart";
import { apiGet } from "../api/client";

// ❌ ЭТО ОШИБКА: useEffect нельзя ставить тут
// useEffect(() => {
//   apiGet("/audit/logs")
//     .then((data) => setAudit(data))
//     .catch((err) => console.error(err));
// }, []);
// ❌ Здесь ещё и нет функции setAudit → ошибка

// ----------------------------
// Типы
// ----------------------------
interface AuditRecord {
  id: number;
  time: string;
  user: string;
  action: string;
  ip: string;
  category: "auth" | "session" | "policy" | "vault" | "system";
  status: "success" | "failed" | "warning";
  details?: string | null; // ⬅ Добавлено
}

// ----------------------------
// Детальная панель события
// ----------------------------
function AuditDetailPanel({
  open,
  onClose,
  record,
}: {
  open: boolean;
  onClose: () => void;
  record: AuditRecord | null;
}) {
  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-[9999]">
      <div className="w-[420px] bg-[#121A33] h-full p-6 text-white shadow-xl overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Детали события</h2>

        <div className="space-y-3">
          <p><strong>Время:</strong> {record.time}</p>
          <p><strong>Пользователь:</strong> {record.user}</p>
          <p><strong>IP:</strong> {record.ip}</p>

          <p>
            <strong>Категория:</strong>{" "}
            {{
              auth: "Аутентификация",
              session: "Сессии",
              policy: "Политики",
              vault: "Хранилище секретов",
              system: "Система",
            }[record.category]}
          </p>

          <p>
            <strong>Статус:</strong>{" "}
            {{
              success: "Успех",
              failed: "Ошибка",
              warning: "Предупреждение",
            }[record.status]}
          </p>

          <p><strong>Действие:</strong> {record.action}</p>

          {record.details && (
            <div className="mt-4 p-3 bg-[#0E1A3A] rounded-lg border border-white/10">
              <p className="font-bold mb-1">Подробности:</p>
              <pre className="text-sm whitespace-pre-wrap">{record.details}</pre>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 px-4 py-2 bg-blue-600 rounded-lg text-white w-full"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

// ----------------------------
// Экспорт CSV
// ----------------------------
function exportCsv(records: AuditRecord[]) {
  const header = "id,time,user,action,ip,category,status,details\n";

  const rows = records
    .map(
      (r) =>
        `${r.id},${r.time},${r.user},"${r.action}",${r.ip},${r.category},${r.status},"${r.details ?? ""}"`
    )
    .join("\n");

  const csvContent = "\uFEFF" + header + rows;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "audit_logs.csv";
  a.click();
}

// ----------------------------
// Экспорт JSON
// ----------------------------
function exportJson(records: AuditRecord[]) {
  const blob = new Blob([JSON.stringify(records, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "audit_logs.json";
  a.click();
}

// ----------------------------
// Основной компонент
// ----------------------------
export default function Audit() {
  const [records, setRecords] = useState<AuditRecord[]>([
    {
      id: 1,
      time: "10:22",
      user: "admin",
      action: "Вход в систему",
      ip: "192.168.1.1",
      category: "auth",
      status: "success",
      details: "Пользователь успешно вошёл через веб-интерфейс.",
    },
    {
      id: 2,
      time: "10:15",
      user: "root",
      action: "Смена пароля",
      ip: "10.0.0.5",
      category: "vault",
      status: "failed",
      details: "Ошибка: политика не разрешает слабые пароли.",
    },
    {
      id: 3,
      time: "09:59",
      user: "security",
      action: "Просмотр логов",
      ip: "172.16.4.22",
      category: "policy",
      status: "success",
    },
    {
      id: 4,
      time: "09:41",
      user: "operator01",
      action: "Запуск SSH-сессии",
      ip: "172.16.0.3",
      category: "session",
      status: "warning",
      details: "Замечание: соединение установлено с нестандартного порта.",
    },
  ]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);

  const openDetails = (record: AuditRecord) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  };

  // ----------------------------
  // 🔥 ПРАВИЛЬНЫЙ useEffect ВНУТРИ КОМПОНЕНТА
  // ----------------------------
  useEffect(() => {
    apiGet("/audit/logs")
      .then((data) => {
        console.log("AUDIT DATA:", data);
        setRecords(data); // ⬅ заменено setAudit → setRecords
      })
      .catch((err) => console.error("Ошибка загрузки audit:", err));
  }, []);

  // ----------------------------
  // Фильтрация
  // ----------------------------
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchText =
        r.user.toLowerCase().includes(search.toLowerCase()) ||
        r.action.toLowerCase().includes(search.toLowerCase()) ||
        r.ip.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchCategory =
        categoryFilter === "all" || r.category === categoryFilter;

      return matchText && matchStatus && matchCategory;
    });
  }, [records, search, statusFilter, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const currentRows = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // ----------------------------
  // Статистика
  // ----------------------------
  const successCount = records.filter((r) => r.status === "success").length;
  const failedCount = records.filter((r) => r.status === "failed").length;
  const warningCount = records.filter((r) => r.status === "warning").length;

  return (
    <div className="p-8 w-full bg-white text-gray-900 space-y-6">
      <h1 className="text-3xl font-bold mb-4">Аудит</h1>
      <p className="text-gray-600 text-lg mb-4">
        Журнал действий пользователей и системных событий
      </p>

      {/* Статистика */}
      <div className="flex gap-4 mb-6">
        <PolicyPieChart active={successCount} disabled={failedCount} />

        <div className="flex flex-col justify-center gap-3">
          <div className="px-4 py-2 bg-green-100 border border-green-400 rounded-xl text-green-700 font-medium">
            Успешных: {successCount}
          </div>
          <div className="px-4 py-2 bg-red-100 border border-red-400 rounded-xl text-red-700 font-medium">
            Ошибок: {failedCount}
          </div>
          <div className="px-4 py-2 bg-yellow-100 border border-yellow-400 rounded-xl text-yellow-700 font-medium">
            Предупреждений: {warningCount}
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex gap-3 items-center bg-white border border-gray-200 shadow-md p-4 rounded-xl">
        <Input
          placeholder="Поиск по действию, пользователю или IP..."
          className="w-80 bg-white border text-gray-900 placeholder-gray-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="bg-white border border-gray-300 rounded-lg p-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="success">Успешно</option>
          <option value="failed">Ошибка</option>
          <option value="warning">Предупреждение</option>
        </select>

        <select
          className="bg-white border border-gray-300 rounded-lg p-2"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Все категории</option>
          <option value="auth">Аутентификация</option>
          <option value="session">Сессии</option>
          <option value="policy">Политики</option>
          <option value="vault">Хранилище</option>
          <option value="system">Система</option>
        </select>

        <button
          onClick={() => exportCsv(filtered)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Экспорт CSV
        </button>

        <button
          onClick={() => exportJson(filtered)}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg"
        >
          JSON
        </button>
      </div>

      {/* Таблица */}
      <div className="overflow-y-auto max-h-[500px] rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33]">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left">Время</th>
              <th className="p-3 text-left">Пользователь</th>
              <th className="p-3 text-left">Категория</th>
              <th className="p-3 text-left">Действие</th>
              <th className="p-3 text-left">IP</th>
              <th className="p-3 text-left">Статус</th>
              <th className="p-3 text-left">Действия</th>
            </tr>
          </thead>

          <tbody>
            {currentRows.map((record) => (
              <tr
                key={record.id}
                className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] transition"
              >
                <td className="p-3">{record.time}</td>
                <td className="p-3 text-gray-300">{record.user}</td>

                <td className="p-3 text-gray-300">
                  {{
                    auth: "Аутентификация",
                    session: "Сессии",
                    policy: "Политики",
                    vault: "Хранилище секретов",
                    system: "Система",
                  }[record.category]}
                </td>

                <td className="p-3 text-gray-300">{record.action}</td>
                <td className="p-3 text-gray-300">{record.ip}</td>

                <td className="p-3">
                  {record.status === "success" && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-700 text-white">
                      Успех
                    </span>
                  )}
                  {record.status === "failed" && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-700 text-white">
                      Ошибка
                    </span>
                  )}
                  {record.status === "warning" && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-white">
                      Внимание
                    </span>
                  )}
                </td>

                <td className="p-3">
                  <ActionMenuAudit
                    onView={() => openDetails(record)}
                    onDelete={() =>
                      setRecords((prev) =>
                        prev.filter((r) => r.id !== record.id)
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Панель деталей */}
      <AuditDetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        record={selectedRecord}
      />

      {/* Pagination */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <span>Показать:</span>
          <select
            className="border p-1 rounded"
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

        <div className="flex gap-2 items-center">
          <button
            className="px-2"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            {"<<"}
          </button>

          <button
            className="px-2"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            {"<"}
          </button>

          <span className="font-medium">
            {currentPage} / {totalPages}
          </span>

          <button
            className="px-2"
            onClick={() =>
              setCurrentPage((p) => Math.min(p + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            {">"}
          </button>

          <button
            className="px-2"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            {">>"}
          </button>
        </div>
      </div>
    </div>
  );
}
