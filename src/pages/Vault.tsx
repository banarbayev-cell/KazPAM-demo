import { useEffect, useMemo, useState } from "react";
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
  updated: string; // "DD.MM.YYYY"
  type: string;
  platform: string;

  // Усиление (не ломает демо): если backend даст id — используем его
  id?: string;
}

// ------------------------------------------------------------
// ИКОНКИ ДЛЯ ПЛАТФОРМ
// ------------------------------------------------------------
const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "Windows":
      return <FaWindows className="text-blue-600" />;
    case "Linux":
      return <FaLinux className="text-orange-600" />;
    case "Cisco":
      return <SiCisco className="text-red-600" />;
    case "PostgreSQL":
      return <SiPostgresql className="text-blue-800" />;
    case "MySQL":
      return <SiMysql className="text-blue-500" />;
    case "AWS":
      return <FaAws className="text-yellow-500" />;
    case "Solaris":
      return <FaServer className="text-orange-600" />;
    default:
      return <FaServer className="text-gray-400" />;
  }
};

// ------------------------------------------------------------
// ДЕМО-ДАННЫЕ (ОСТАВЛЯЕМ: fallback если backend Vault ещё не готов)
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

// ------------------------------------------------------------
// BACKEND DTO (ожидаемое: как только появится Vault API, всё заработает)
// ------------------------------------------------------------
type VaultSecretDTO = {
  id: string;
  system: string;
  login: string;
  type: string;
  platform: string;
  updated?: string; // "DD.MM.YYYY" если backend отдаёт так
  updated_at?: string; // ISO если backend отдаёт так
};

type VaultHistoryItemDTO = {
  time: string;
  user: string;
  action: string;
  ip?: string;
  status?: string;
};

type VaultRevealDTO = {
  id: string;
  value: string;
};

function normalizeUpdated(dto: VaultSecretDTO): string {
  if (dto.updated && dto.updated.includes(".")) return dto.updated;

  if (dto.updated_at) {
    const d = new Date(dto.updated_at);
    if (!Number.isNaN(+d)) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    }
  }

  return "—";
}

function mapDtoToRecord(dto: VaultSecretDTO): SecretRecord {
  return {
    id: dto.id,
    system: dto.system,
    login: dto.login,
    type: dto.type,
    platform: dto.platform,
    updated: normalizeUpdated(dto),
    icon: getPlatformIcon(dto.platform),
  };
}

function getAuthToken(): string | null {
  const keys = ["token", "access_token", "jwt", "auth_token"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v.trim()) return v;
  }

  const jsonKeys = ["auth", "authStore", "kazpam_auth", "session"];
  for (const k of jsonKeys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      const possible =
        obj?.token || obj?.access_token || obj?.jwt || obj?.state?.token || obj?.state?.access_token;
      if (possible && String(possible).trim()) return String(possible);
    } catch {
      // ignore
    }
  }

  return null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as any),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...init, headers });

  if (!res.ok) {
    // 404 по Vault сейчас ожидаем, т.к. роутов нет в backend — обработаем выше.
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data?.detail || data?.message || msg;
    } catch {
      // ignore
    }
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return (await res.json()) as T;
}

// Vault API (ожидаемые пути; если пока не реализовано — будет fallback)
async function vaultListSecrets(): Promise<VaultSecretDTO[]> {
  return apiFetch<VaultSecretDTO[]>(`/vault/secrets`, { method: "GET" });
}
async function vaultGetHistory(secretId: string): Promise<VaultHistoryItemDTO[]> {
  return apiFetch<VaultHistoryItemDTO[]>(`/vault/secrets/${secretId}/history`, { method: "GET" });
}
async function vaultRevealSecret(secretId: string, mfa_code: string): Promise<VaultRevealDTO> {
  // enterprise pattern: reveal обычно POST, чтобы передать MFA code и записать audit
  return apiFetch<VaultRevealDTO>(`/vault/secrets/${secretId}/reveal`, {
    method: "POST",
    body: JSON.stringify({ mfa_code }),
  });
}
async function vaultCreateSecret(payload: any): Promise<VaultSecretDTO> {
  return apiFetch<VaultSecretDTO>(`/vault/secrets`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export default function Vault() {
  const [secretsList, setSecretsList] = useState<SecretRecord[]>(initialSecrets);

  const [openMFA, setOpenMFA] = useState(false);
  const [selectedSecret, setSelectedSecret] = useState<string | null>(null);

  const [openHistory, setOpenHistory] = useState(false);
  const [historySecret, setHistorySecret] = useState<SecretRecord | null>(null);

  const [openCreate, setOpenCreate] = useState(false);

  // Усиление: статус загрузки и ошибка загрузки
  const [loadingList, setLoadingList] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ------------------------------------------------------------
  // ФИЛЬТРЫ
  // ------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortByDate, setSortByDate] = useState("newest");

  // ------------------------------------------------------------
  // ПОДГОТОВКА: выбранный элемент и действие (reveal/copy)
  // ------------------------------------------------------------
  const [selectedItem, setSelectedItem] = useState<SecretRecord | null>(null);
  const [pendingAction, setPendingAction] = useState<"reveal" | "copy" | null>(null);

  // ------------------------------------------------------------
  // ПОИСК + ФИЛЬТРЫ + СОРТИРОВКА
  // ------------------------------------------------------------
  const filtered = useMemo(() => {
    return secretsList
      .filter(
        (s) =>
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);

  // ------------------------------------------------------------
  // ЗАГРУЗКА ИЗ BACKEND (если Vault API уже есть)
  // Если пока нет — fallback на initialSecrets
  // ------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingList(true);
      setLoadError(null);

      try {
        const list = await vaultListSecrets();
        const mapped = list.map(mapDtoToRecord);
        if (!mounted) return;

        // если backend пустой — можно оставить демо, чтобы страница не была пустой
        setSecretsList(mapped.length ? mapped : initialSecrets);
      } catch (e: any) {
        if (!mounted) return;

        // Если 404 — Vault API ещё не внедрён в backend: это ожидаемо.
        if (e?.status === 404) {
          setLoadError("Vault API ещё не включён на backend. Используются демо-данные.");
          setSecretsList(initialSecrets);
        } else {
          setLoadError(e?.message || "Не удалось загрузить Secrets из backend. Используются демо-данные.");
          setSecretsList(initialSecrets);
        }
      } finally {
        if (mounted) setLoadingList(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // ------------------------------------------------------------
  // История: fallback если нет backend
  // ------------------------------------------------------------
  const [historyItems, setHistoryItems] = useState<
    { time: string; user: string; action: string; ip: string; status: string }[]
  >([]);

  // ------------------------------------------------------------
  // ОБРАБОТЧИКИ (усиленные)
  // ------------------------------------------------------------
  const handleReveal = (item: SecretRecord) => {
    setSelectedItem(item);
    setPendingAction("reveal");
    setSelectedSecret(item.system);
    setOpenMFA(true);
  };

  const handleCopy = (item: SecretRecord) => {
    setSelectedItem(item);
    setPendingAction("copy");
    setSelectedSecret(item.system);
    setOpenMFA(true);
  };

  const openHistoryPanel = async (secret: SecretRecord) => {
    setHistorySecret(secret);
    setOpenHistory(true);

    const fallback = [
      { time: "19:32", user: "admin", action: "Просмотр", ip: "192.168.1.42", status: "Успешно" },
      { time: "19:27", user: "root", action: "Изменение пароля", ip: "10.0.0.78", status: "Отклонено" },
      { time: "19:25", user: "audit", action: "Сканирование", ip: "185.22.91.14", status: "Подозрительно" },
    ];

    // Если нет id — это демо, оставляем fallback
    if (!secret.id) {
      setHistoryItems(fallback);
      return;
    }

    try {
      const items = await vaultGetHistory(secret.id);
      setHistoryItems(
        items.map((x) => ({
          time: x.time,
          user: x.user,
          action: x.action,
          ip: x.ip || "—",
          status: x.status || "—",
        }))
      );
    } catch (e: any) {
      // если backend ещё не умеет history — fallback
      setHistoryItems(fallback);
    }
  };

  const handleCreateSecret = async (newData: any) => {
    const icon = getPlatformIcon(newData.platform);

    // 1) оптимистично добавляем локально (не ломаем UX)
    const optimistic: SecretRecord = {
      system: newData.system,
      login: newData.login,
      type: newData.type,
      updated: newData.updated,
      platform: newData.platform,
      icon,
    };

    setSecretsList((prev) => [optimistic, ...prev]);
    setOpenCreate(false);

    // 2) пробуем создать в backend (когда API будет готов)
    try {
      const created = await vaultCreateSecret({
        system: newData.system,
        login: newData.login,
        type: newData.type,
        platform: newData.platform,
        // value: newData.value, // если модалка отдаёт value и backend принимает
      });

      const mapped = mapDtoToRecord(created);

      // 3) заменяем первый элемент (наш optimistic) на backend-версию с id
      setSecretsList((prev) => {
        const copy = [...prev];
        copy[0] = mapped;
        return copy;
      });
    } catch {
      // backend ещё не готов — оставляем optimistic запись
    }
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  return (
    <div className="p-6 w-full bg-white text-black min-h-screen">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold">Хранилище привилегий (Vault)</h1>
          {loadingList && <div className="text-sm text-gray-600 mt-1">Загрузка из backend...</div>}
          {loadError && <div className="text-sm text-gray-600 mt-1">{loadError}</div>}
        </div>

        <Button onClick={() => setOpenCreate(true)}>+ Добавить секрет</Button>
      </div>

      {/* Фильтры */}
      <div className="flex gap-3 items-center mb-6">
        {/* Поиск */}
        <input
          placeholder="Поиск..."
          className="w-72 bg-white text-black border p-2 rounded"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        {/* Тип */}
        <select
          className="bg-white text-black border rounded p-2"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
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
          onChange={(e) => {
            setPlatformFilter(e.target.value);
            setCurrentPage(1);
          }}
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
          onChange={(e) => {
            setSortByDate(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
        </select>
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
                key={item.id ? item.id : index}
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
                    onClick={() => handleReveal(item)}
                  >
                    Показать
                  </button>

                  <button
                    className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700"
                    onClick={() => handleCopy(item)}
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
          <button className="px-2 text-black" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
            {"<<"}
          </button>

          <button
            className="px-2 text-black"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            {"<"}
          </button>

          <span className="font-medium">
            {currentPage} / {totalPages}
          </span>

          <button
            className="px-2 text-black"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* MFA: теперь реальная проверка через backend /mfa/verify.
          После успеха — делаем reveal/copy через backend Vault API (если он есть),
          иначе — безопасный fallback. */}
      <MFAConfirmModal
        open={openMFA}
        onClose={() => setOpenMFA(false)}
        verifyMode="backend"
        onSuccess={async (mfaCode) => {
          try {
            if (!selectedItem) {
              alert("Не выбран секрет.");
              return;
            }

            // Если секрет демо и не имеет id — оставляем прежнее поведение (не ломаем)
            if (!selectedItem.id) {
              alert(`🔓 Доступ к секрету "${selectedItem.system}" подтверждён (demo).`);
              return;
            }

            // Пытаемся раскрыть через backend Vault API
            const revealed = await vaultRevealSecret(selectedItem.id, mfaCode);

            if (pendingAction === "copy") {
              await navigator.clipboard.writeText(revealed.value);
              alert(`Секрет "${selectedItem.system}" скопирован в буфер обмена.`);
            } else {
              alert(`Секрет "${selectedItem.system}":\n\n${revealed.value}`);
            }
          } catch (e: any) {
            // Если Vault API пока не реализован — получим 404/422 и покажем понятное сообщение
            alert(e?.message || "Ошибка доступа к секрету");
          } finally {
            setPendingAction(null);
            setSelectedItem(null);
            setOpenMFA(false);
          }
        }}
      />

      {/* История */}
      <VaultHistoryPanel
        open={openHistory}
        onClose={() => setOpenHistory(false)}
        system={historySecret?.system}
        login={historySecret?.login}
        updated={historySecret?.updated}
        type={historySecret?.type}
        history={historyItems}
        onInvestigate={() => console.log("Investigate")}
        onRestrict={() => console.log("Restrict")}
      />

      {/* Создание секрета */}
      <CreateSecretModal open={openCreate} onClose={() => setOpenCreate(false)} onCreate={handleCreateSecret} />
    </div>
  );
}
