import { useEffect, useMemo, useState } from "react";
import { FaWindows, FaLinux, FaAws, FaServer } from "react-icons/fa";
import { SiCisco, SiMysql, SiPostgresql } from "react-icons/si";
import { toast } from "sonner";

import MFAConfirmModal from "../components/modals/MFAConfirmModal";
import VaultHistoryPanel from "../components/panels/VaultHistoryPanel";
import CreateSecretModal from "../components/modals/CreateSecretModal";
import { Button } from "../components/ui/button";

import { api } from "@/services/api";
import { useAuth } from "@/store/auth";
import { revealSecretApproved } from "@/api/vaultReveal";
import SecureRevealModal from "@/components/modals/SecureRevealModal";


/* ============================================================
   Types
============================================================ */

interface SecretRecord {
  id: number;
  system: string;
  login: string;
  updated: string; // "DD.MM.YYYY"
  type: string;
  platform: string;
  icon: JSX.Element;
}

type VaultSecretDTO = {
  id: number;
  system: string;
  login: string;
  type: string;
  platform: string;
  updated?: string; // "DD.MM.YYYY" (если backend отдаёт так)
  updated_at?: string; // ISO (если backend отдаёт так)
};

type VaultHistoryItemDTO = {
  time: string;
  user: string;
  action: string;
  ip?: string;
  status?: string;
};

type VaultRevealDTO = {
  id: number;
  value: string;
};

/* ============================================================
   Icons
============================================================ */

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

/* ============================================================
   Helpers
============================================================ */

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
    id: Number(dto.id),
    system: dto.system,
    login: dto.login,
    type: dto.type,
    platform: dto.platform,
    updated: normalizeUpdated(dto),
    icon: getPlatformIcon(dto.platform),
  };
}

/* ============================================================
   API calls (production)
============================================================ */

async function vaultListSecrets(): Promise<VaultSecretDTO[]> {
  return api.get<VaultSecretDTO[]>("/vault/secrets");
}

async function vaultGetHistory(secretId: number): Promise<VaultHistoryItemDTO[]> {
  return api.get<VaultHistoryItemDTO[]>(`/vault/secrets/${secretId}/history`);
}

async function vaultRevealSecretV1(secretId: number, mfa_code: string): Promise<VaultRevealDTO> {
  return api.post<VaultRevealDTO>(`/vault/secrets/${secretId}/reveal`, { mfa_code });
}

async function vaultCopySecret(secretId: number): Promise<void> {
  // backend: POST /vault/secrets/{secret_id}/copy
  await api.post(`/vault/secrets/${secretId}/copy`, {});
}

async function vaultCreateSecret(payload: any): Promise<VaultSecretDTO> {
  return api.post<VaultSecretDTO>(`/vault/secrets`, payload);
}

async function vaultCreateRequest(secretId: number, reason: string): Promise<any> {
  // backend: POST /vault/requests/
  return api.post(`/vault/requests/`, { secret_id: secretId, reason });
}

/* ============================================================
   Component
============================================================ */

export default function Vault() {
  const user = useAuth((s) => s.user);

  const hasPermission = (code: string): boolean =>
    Array.isArray(user?.permissions) && user!.permissions.includes(code);

  const [secretsList, setSecretsList] = useState<SecretRecord[]>([]);

  // loading/errors
  const [loadingList, setLoadingList] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // modals/panels
  const [openMFA, setOpenMFA] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [historySecret, setHistorySecret] = useState<SecretRecord | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  // selected action
  const [selectedItem, setSelectedItem] = useState<SecretRecord | null>(null);
  const [pendingAction, setPendingAction] = useState<"reveal" | "copy" | null>(null);

  // history items
  const [historyItems, setHistoryItems] = useState<
    { time: string; user: string; action: string; ip: string; status: string }[]
  >([]);

  // filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortByDate, setSortByDate] = useState("newest");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
 
  const [revealOpen, setRevealOpen] = useState(false);
const [revealValue, setRevealValue] = useState("");
const [revealTitle, setRevealTitle] = useState("");
const [revealSubtitle, setRevealSubtitle] = useState<string | undefined>(undefined);

  /* ============================================================
     Load secrets (production only)
  ============================================================ */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingList(true);
      setLoadError(null);

      try {
        const list = await vaultListSecrets();
        const mapped = list.map(mapDtoToRecord);
        if (!mounted) return;
        setSecretsList(mapped);
      } catch (e: any) {
        if (!mounted) return;
        const msg = e?.message || "Не удалось загрузить Secrets из backend";
        setLoadError(msg);
        setSecretsList([]);
      } finally {
        if (mounted) setLoadingList(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  /* ============================================================
     Filtering + sorting
  ============================================================ */
  const filtered = useMemo(() => {
    return secretsList
      .filter((s) => {
        const q = search.toLowerCase();
        return s.system.toLowerCase().includes(q) || s.login.toLowerCase().includes(q);
      })
      .filter((s) => (typeFilter === "all" ? true : s.type === typeFilter))
      .filter((s) => (platformFilter === "all" ? true : s.platform === platformFilter))
      .sort((a, b) => {
        const dateA = new Date(a.updated.split(".").reverse().join("-"));
        const dateB = new Date(b.updated.split(".").reverse().join("-"));
        return sortByDate === "newest" ? +dateB - +dateA : +dateA - +dateB;
      });
  }, [secretsList, search, typeFilter, platformFilter, sortByDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);

  /* ============================================================
     Actions
  ============================================================ */

  const handleRevealOrRequest = async (item: SecretRecord, mode: "reveal" | "copy") => {
    // 1) direct reveal path
    if (hasPermission("reveal_vault_secret") || hasPermission("reveal_vault_approved")) {
      setSelectedItem(item);
      setPendingAction(mode);
      setOpenMFA(true);
      return;
    }

    // 2) request access path
    if (hasPermission("request_vault_access")) {
      try {
        await vaultCreateRequest(item.id, "Требуется доступ для выполнения задачи");
        toast.success("Запрос доступа отправлен на согласование");
      } catch (e: any) {
        toast.error(e?.message || "Ошибка при создании запроса доступа");
      }
      return;
    }

    // 3) no rights
    toast.error("Недостаточно прав: нет reveal и нет request_vault_access");
  };

  const handleReveal = async (item: SecretRecord) => {
    await handleRevealOrRequest(item, "reveal");
  };

  const handleCopy = async (item: SecretRecord) => {
    await handleRevealOrRequest(item, "copy");
  };

  const openHistoryPanel = async (secret: SecretRecord) => {
    setHistorySecret(secret);
    setOpenHistory(true);

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
      setHistoryItems([]);
      toast.error(e?.message || "Не удалось загрузить историю секрета");
    }
  };

  const handleCreateSecret = async (newData: any) => {
    // production: создаём в backend, затем перечитываем список
    try {
      await vaultCreateSecret({
        system: newData.system,
        login: newData.login,
        type: newData.type,
        platform: newData.platform,
        // value: newData.value, // включи, если backend принимает value
      });

      toast.success("Секрет создан");
      setOpenCreate(false);

      // reload list
      setLoadingList(true);
      const list = await vaultListSecrets();
      setSecretsList(list.map(mapDtoToRecord));
    } catch (e: any) {
      toast.error(e?.message || "Ошибка создания секрета");
    } finally {
      setLoadingList(false);
    }
  };

  /* ============================================================
     UI
  ============================================================ */

  return (
    <div className="p-6 w-full bg-white text-black min-h-screen">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold">Хранилище привилегий (Vault)</h1>
          {loadingList && <div className="text-sm text-gray-600 mt-1">Загрузка из backend...</div>}
          {loadError && <div className="text-sm text-red-600 mt-1">{loadError}</div>}
        </div>

        <Button onClick={() => setOpenCreate(true)}>+ Добавить секрет</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center mb-6">
        <input
          placeholder="Поиск..."
          className="w-72 bg-white text-black border p-2 rounded"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

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

      {/* Table */}
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
            {loadingList && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-300">
                  Загрузка…
                </td>
              </tr>
            )}

            {!loadingList && currentRows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-300">
                  Секреты не найдены
                </td>
              </tr>
            )}

            {!loadingList &&
              currentRows.map((item) => (
                <tr
                  key={item.id}
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

      {/* Pagination */}
      <div className="flex justify-between items-center p-4">
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

      {/* MFA Confirm → reveal/copy (v2 -> fallback v1) */}
      <MFAConfirmModal
        open={openMFA}
        onClose={() => setOpenMFA(false)}
        verifyMode="backend"
        onSuccess={async (mfaCode) => {
          try {
            if (!selectedItem || !pendingAction) return;

            let revealed: VaultRevealDTO;

            try {
              // Vault v2 approval-based reveal (если есть grant)
              revealed = await revealSecretApproved(Number(selectedItem.id), mfaCode);
            } catch {
              // fallback Vault v1 direct reveal
              revealed = await vaultRevealSecretV1(Number(selectedItem.id), mfaCode);
            }

            if (pendingAction === "copy") {
  await navigator.clipboard.writeText(revealed.value);
  toast.success(`Секрет "${selectedItem.system}" скопирован в буфер обмена.`);

  // backend audit copy (best-effort)
  try {
    await vaultCopySecret(Number(selectedItem.id));
  } catch {
    // ignore
  }
} else {
  // production: показываем секрет ТОЛЬКО в secure modal, не в toast
  setRevealTitle(selectedItem.system);
  setRevealSubtitle(`${selectedItem.login} · ${selectedItem.type}`);
  setRevealValue(revealed.value);
  setRevealOpen(true);

  toast.success(`Доступ к секрету "${selectedItem.system}" подтверждён.`);
}
          } catch (e: any) {
            toast.error(e?.message || "Ошибка доступа к секрету");
          } finally {
            setPendingAction(null);
            setSelectedItem(null);
            setOpenMFA(false);
          }
        }}
      />

      {/* History panel */}
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

      {/* Create secret */}
      <CreateSecretModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreate={handleCreateSecret}
      />

      <SecureRevealModal
  open={revealOpen}
  onClose={() => {
    setRevealOpen(false);
    setRevealValue("");
    setRevealTitle("");
    setRevealSubtitle(undefined);
  }}
  title={revealTitle}
  subtitle={revealSubtitle}
  secretValue={revealValue}
  autoHideSeconds={20}
/>

    </div>
  );
}
