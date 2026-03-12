import { useEffect, useMemo, useState } from "react";
import { fetchSocCommands, SocCommand, SocCommandSeverity } from "../api/socCommands";
import { formatKzDateTime } from "../utils/time";

function safeTime(value?: string) {
  return formatKzDateTime(value, {
    seconds: false,
    naiveInput: "utc",
  });
}


function getCommandChipClass(command: string) {
  const c = command.toLowerCase();

  if (
    c.includes("rm -rf") ||
    c.includes("/etc/shadow") ||
    c.includes("chmod 777") ||
    c.includes("useradd") ||
    c.includes("passwd") ||
    c.includes("sudo su")
  ) {
    return "bg-red-500/20 text-red-300 border border-red-500/30";
  }

  if (
    c.includes("cat ") ||
    c.includes("nano ") ||
    c.includes("vi ") ||
    c.includes("vim ") ||
    c.includes("systemctl ") ||
    c.includes("service ")
  ) {
    return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
  }

  return "bg-[#0E1A3A] text-[#C9D1E7] border border-[#24314F]";
}

function getSeverityChipClass(severity?: SocCommandSeverity) {
  if (severity === "high") {
    return "bg-red-500/20 text-red-300 border border-red-500/30";
  }

  if (severity === "medium") {
    return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
  }

  if (severity === "low") {
    return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  }

  return "bg-[#0E1A3A] text-gray-300 border border-[#24314F]";
}

function getSeverityLabel(severity?: SocCommandSeverity) {
  if (severity === "high") return "High";
  if (severity === "medium") return "Medium";
  if (severity === "low") return "Low";
  return "—";
}

export default function SocCommands() {
  const [commands, setCommands] = useState<SocCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);

    fetchSocCommands()
      .then((data) => setCommands(Array.isArray(data) ? data : []))
      .catch((e: any) => {
        console.error("SOC commands load error:", e);
        setLoadError(e?.message || "Не удалось загрузить команды сессий");
        setCommands([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return commands.filter((item) => {
      const matchesSeverity =
        severityFilter === "all" ? true : item.severity === severityFilter;

      if (!matchesSeverity) return false;

      if (!q) return true;

      return (
        String(item.time || "").toLowerCase().includes(q) ||
        String(item.user || "").toLowerCase().includes(q) ||
        String(item.system || "").toLowerCase().includes(q) ||
        String(item.session_id || "").toLowerCase().includes(q) ||
        String(item.command || "").toLowerCase().includes(q) ||
        String(item.severity || "").toLowerCase().includes(q) ||
        String(item.risk_reason || "").toLowerCase().includes(q)
      );
    });
  }, [commands, search, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="p-6 w-full bg-gray-100 text-black min-h-screen">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold">SOC · Команды сессий</h1>

          {loading && (
            <div className="text-sm text-gray-600 mt-1">Загрузка...</div>
          )}

          {loadError && (
            <div className="text-sm text-red-600 mt-1">{loadError}</div>
          )}

          {!loading && !loadError && (
            <div className="text-sm text-gray-600 mt-1">
              Всего команд: <span className="font-semibold">{filtered.length}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-6">
        <input
          type="text"
          placeholder="Поиск по времени, пользователю, системе, сессии, риску или команде"
          className="w-full max-w-[520px] bg-white text-black border border-gray-300 p-2 rounded-lg"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        <select
          className="bg-white text-black border border-gray-300 p-2 rounded-lg"
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value as "all" | "low" | "medium" | "high");
            setCurrentPage(1);
          }}
        >
          <option value="all">Все риски</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          className="bg-white text-black border border-gray-300 p-2 rounded-lg"
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          <option value={10}>10 строк</option>
          <option value={20}>20 строк</option>
          <option value={50}>50 строк</option>
          <option value={100}>100 строк</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33]">
        <table className="w-full text-sm text-white">
          <thead className="bg-[#1A243F] text-gray-300">
            <tr>
              <th className="p-3 text-left">Время</th>
              <th className="p-3 text-left">Пользователь</th>
              <th className="p-3 text-left">Система</th>
              <th className="p-3 text-left">Сессия</th>
              <th className="p-3 text-left">Риск</th>
              <th className="p-3 text-left">Команда</th>
            </tr>
          </thead>

          <tbody>
            {!loading && currentRows.length === 0 && (
              <tr className="border-t border-[#1E2A45]">
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  Команды не найдены
                </td>
              </tr>
            )}

            {!loading &&
              currentRows.map((c, i) => (
                <tr
                  key={`${c.session_id}-${c.time}-${i}`}
                  className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] transition"
                >
                  <td className="p-3 text-gray-300 whitespace-nowrap">
                    {safeTime(c.time)}
                  </td>

                  <td className="p-3 text-white font-medium">
                    {c.user || "—"}
                  </td>

                  <td className="p-3 text-[#C9D1E7]">
                    {c.system || "—"}
                  </td>

                  <td className="p-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#0E1A3A] text-[#3BE3FD] border border-[#24314F] font-mono text-xs">
                      #{c.session_id}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        title={c.risk_reason || ""}
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getSeverityChipClass(
                          c.severity
                        )}`}
                      >
                        {getSeverityLabel(c.severity)}
                      </span>

                      {typeof c.risk_score === "number" && (
                        <span className="text-xs text-gray-400">
                          {c.risk_score}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3">
                    <code
                      title={c.risk_reason || ""}
                      className={`inline-block px-2.5 py-1 rounded-md text-xs md:text-sm font-mono break-all ${getCommandChipClass(
                        c.command || ""
                      )}`}
                    >
                      {c.command || "—"}
                    </code>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
          <div className="text-sm text-gray-600">
            Показано {indexOfFirst + 1}–{Math.min(indexOfLast, filtered.length)} из{" "}
            {filtered.length}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-black disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Назад
            </button>

            <div className="px-3 py-1.5 rounded-md bg-white border border-gray-300 text-sm">
              {currentPage} / {totalPages}
            </div>

            <button
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-black disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </div>
  );
}