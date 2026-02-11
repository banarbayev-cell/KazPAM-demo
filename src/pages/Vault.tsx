import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaWindows, FaLinux, FaAws, FaServer, FaLock } from "react-icons/fa"; // Added Lock icon
import { SiCisco, SiMysql, SiPostgresql } from "react-icons/si";
import { toast } from "sonner";

import MFAConfirmModal from "../components/modals/MFAConfirmModal";
import VaultHistoryPanel from "../components/panels/VaultHistoryPanel";
import CreateSecretModal from "../components/modals/CreateSecretModal";
import SecureRevealModal from "@/components/modals/SecureRevealModal";
import { Button } from "../components/ui/button";

import { api } from "@/services/api";
import { useAuth } from "@/store/auth";
import { revealSecretApproved } from "@/api/vaultReveal";

/* ============================================================
   Types
============================================================ */

interface SecretRecord {
  id: number;
  system: string;
  login: string;
  updated: string;
  type: string;
  platform: string;
  restricted: boolean;
  icon: JSX.Element;
}

type VaultSecretDTO = {
  id: number;
  system: string;
  login: string;
  type: string;
  platform: string;
  restricted?: boolean;
  updated_at?: string; 
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

/* ============================================================
   Helpers
============================================================ */

function normalizeUpdated(dto: VaultSecretDTO): string {
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
    restricted: Boolean(dto.restricted), // Теперь это поле точно приходит с бэка
    updated: normalizeUpdated(dto),
    icon: getPlatformIcon(dto.platform),
  };
}

/* ============================================================
   API calls
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
  await api.post(`/vault/secrets/${secretId}/copy`, {});
}

async function vaultCreateSecret(payload: any): Promise<VaultSecretDTO> {
  return api.post<VaultSecretDTO>(`/vault/secrets`, payload);
}

async function vaultCreateRequest(secretId: number, reason: string): Promise<any> {
  return api.post(`/vault/requests/`, { secret_id: secretId, reason });
}

async function vaultRestrictSecret(secretId: number, reason: string): Promise<any> {
    return api.post(`/vault/secrets/${secretId}/restrict`, { reason });
}

/* ============================================================
   Component
============================================================ */

export default function Vault() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  const hasPermission = (code: string): boolean =>
    Array.isArray(user?.permissions) && user!.permissions.includes(code);

  const [secretsList, setSecretsList] = useState<SecretRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // modals
  const [openMFA, setOpenMFA] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [historySecret, setHistorySecret] = useState<SecretRecord | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const [selectedItem, setSelectedItem] = useState<SecretRecord | null>(null);
  const [pendingAction, setPendingAction] = useState<"reveal" | "copy" | null>(null);

  const [historyItems, setHistoryItems] = useState<VaultHistoryItemDTO[]>([]);

  // filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortByDate, setSortByDate] = useState("newest");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // secure reveal
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealValue, setRevealValue] = useState("");
  const [revealTitle, setRevealTitle] = useState("");
  const [revealSubtitle, setRevealSubtitle] = useState<string | undefined>(undefined);
  
  // URL Params logic
  const querySecretId = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const raw = sp.get("secret_id");
    return raw ? Number(raw) : null;
  }, [location.search]);

  const queryOpenHistory = useMemo(() => {
    return new URLSearchParams(location.search).get("history") === "1";
  }, [location.search]);

  const [focusedSecretId, setFocusedSecretId] = useState<number | null>(null);
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (querySecretId && Number.isFinite(querySecretId)) setFocusedSecretId(querySecretId);
  }, [querySecretId]);

  // Load Data
  const loadData = useCallback(async () => {
      setLoadingList(true);
      setLoadError(null);
      try {
        const list = await vaultListSecrets();
        setSecretsList(list.map(mapDtoToRecord));
      } catch (e: any) {
        setLoadError(e?.message || "Не удалось загрузить Secrets");
        setSecretsList([]);
      } finally {
        setLoadingList(false);
      }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtering
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

  // Auto-focus logic
  useEffect(() => {
    if (!focusedSecretId) return;
    const idx = filtered.findIndex((x) => x.id === focusedSecretId);
    if (idx === -1) return;
    const targetPage = Math.floor(idx / rowsPerPage) + 1;
    if (targetPage !== currentPage) setCurrentPage(targetPage);
  }, [focusedSecretId, filtered, rowsPerPage]); // Removed currentPage to avoid loop

  useEffect(() => {
     if (focusedSecretId && rowRefs.current[focusedSecretId]) {
         rowRefs.current[focusedSecretId]?.scrollIntoView({ behavior: "smooth", block: "center" });
     }
  }, [focusedSecretId, currentRows]);

  // History Panel Open
  const openHistoryPanel = useCallback(async (secret: SecretRecord) => {
      setHistorySecret(secret);
      setOpenHistory(true);
      try {
        const items = await vaultGetHistory(secret.id);
        setHistoryItems(items);
      } catch (e: any) {
        setHistoryItems([]);
        toast.error("Ошибка загрузки истории");
      }
    }, []);

  useEffect(() => {
    if (queryOpenHistory && focusedSecretId) {
        const item = secretsList.find(x => x.id === focusedSecretId);
        if (item && !openHistory) openHistoryPanel(item);
    }
  }, [queryOpenHistory, focusedSecretId, secretsList, openHistoryPanel]);

  // Actions
  const handleRevealOrRequest = async (item: SecretRecord, mode: "reveal" | "copy") => {
    // 0. Check Restriction
    if (item.restricted) {
        toast.error("ДОСТУП ЗАБЛОКИРОВАН SOC. Обратитесь к администратору безопасности.");
        return;
    }

    // 1. Reveal (Direct)
    if (hasPermission("reveal_vault_secret") || hasPermission("reveal_vault_approved")) {
      setSelectedItem(item);
      setPendingAction(mode);
      setOpenMFA(true);
      return;
    }

    // 2. Request
    if (hasPermission("request_vault_access")) {
      try {
        await vaultCreateRequest(item.id, "Требуется доступ для задачи");
        toast.success("Запрос отправлен на согласование");
      } catch (e: any) {
        toast.error(e?.message || "Ошибка запроса");
      }
      return;
    }

    toast.error("Недостаточно прав");
  };

  const handleCreateSecret = async (newData: any) => {
    try {
      await vaultCreateSecret({
        system: newData.system,
        login: newData.login,
        type: newData.type,
        platform: newData.platform,
        value: newData.value,
      });
      toast.success("Секрет создан");
      setOpenCreate(false);
      loadData();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка создания");
    }
  };

  const handleInvestigate = () => {
    if (!historySecret) return;
    navigate("/soc", {
      state: {
        focus: { kind: "vault_secret", secretId: historySecret.id, system: historySecret.system },
      },
    });
  }; 

  // === UPDATED RESTRICT LOGIC ===
  const handleRestrict = async () => {
    if (!historySecret) return;
    const reason = prompt("Укажите причину блокировки доступа (SOC):");
    if (!reason) return;

    try {
        // 1. Вызываем прямой API блокировки (Combat Mode)
        await vaultRestrictSecret(historySecret.id, reason);
        toast.success("Секрет ЗАБЛОКИРОВАН. Доступ запрещен.");

        // 2. Дублируем в инциденты (для отчетности)
        try {
            await api.post("/incidents/", {
                title: "Vault: Ручная блокировка",
                category: "vault",
                severity: "high",
                details: JSON.stringify({ secret_id: historySecret.id, reason }),
            });
        } catch { /* ignore optional incident creation error */ }

        // 3. Обновляем список, чтобы появился замок
        setOpenHistory(false);
        loadData();

    } catch (e: any) {
        toast.error(e?.message || "Ошибка блокировки");
    }
  };

  return (
    <div className="p-6 w-full bg-white text-black min-h-screen">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold">Хранилище привилегий (Vault)</h1>
          {loadingList && <div className="text-sm text-gray-600 mt-1">Загрузка...</div>}
          {loadError && <div className="text-sm text-red-600 mt-1">{loadError}</div>}
        </div>
        <Button onClick={() => setOpenCreate(true)}>+ Добавить секрет</Button>
      </div>

      {/* Filters (Simplified for brevity, same as before) */}
      <div className="flex gap-3 items-center mb-6">
        <input placeholder="Поиск..." className="w-72 bg-white text-black border p-2 rounded" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
        {/* ... Selects ... */}
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
            {!loadingList && currentRows.map((item) => {
                const isFocused = focusedSecretId === item.id;
                return (
                  <tr key={item.id} ref={(el) => { rowRefs.current[item.id] = el; }}
                    className={`border-t border-[#1E2A45] transition ${isFocused ? "bg-[#0B1E4A] shadow-[inset_0_0_0_2px_#0052FF]" : "hover:bg-[#0E1A3A]"} ${item.restricted ? "bg-red-900/20" : ""}`}
                  >
                    <td className="p-3 flex items-center gap-2">
                      {item.restricted && <FaLock className="text-red-500 animate-pulse" title="Доступ ограничен SOC" />}
                      {item.icon} 
                      <span className={item.restricted ? "text-red-300 line-through" : ""}>{item.system}</span>
                    </td>
                    <td className="p-3">{item.login}</td>
                    <td className="p-3">{item.updated}</td>
                    <td className="p-3">{item.type}</td>
                    <td className="p-3 flex gap-2">
                      <button disabled={item.restricted} className={`px-3 py-1 rounded text-white ${item.restricted ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`} onClick={() => handleRevealOrRequest(item, "reveal")}>
                        Показать
                      </button>
                      <button disabled={item.restricted} className={`px-3 py-1 rounded text-white ${item.restricted ? "bg-gray-600 cursor-not-allowed" : "bg-gray-600 hover:bg-gray-700"}`} onClick={() => handleRevealOrRequest(item, "copy")}>
                        Скопировать
                      </button>
                      <button className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 text-white" onClick={() => openHistoryPanel(item)}>
                        Подробнее →
                      </button>
                    </td>
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination & Modals (Same as before) */}
      <MFAConfirmModal
        open={openMFA}
        onClose={() => setOpenMFA(false)}
        verifyMode="backend"
        onSuccess={async (mfaCode) => {
          if (!selectedItem || !pendingAction) return;
          try {
             let revealed: VaultRevealDTO;
             try {
                revealed = await revealSecretApproved(selectedItem.id, mfaCode);
             } catch {
                revealed = await vaultRevealSecretV1(selectedItem.id, mfaCode);
             }
             
             if (pendingAction === "copy") {
                await navigator.clipboard.writeText(revealed.value);
                toast.success("Секрет скопирован");
                vaultCopySecret(selectedItem.id); // fire & forget audit
             } else {
                setRevealTitle(selectedItem.system);
                setRevealSubtitle(`${selectedItem.login}`);
                setRevealValue(revealed.value);
                setRevealOpen(true);
             }
          } catch (e: any) {
             toast.error(e?.message || "Ошибка доступа");
          } finally {
             setPendingAction(null);
             setSelectedItem(null);
             setOpenMFA(false);
          }
        }}
      />
      
      <VaultHistoryPanel
        open={openHistory}
        onClose={() => setOpenHistory(false)}
        system={historySecret?.system}
        login={historySecret?.login}
        updated={historySecret?.updated}
        type={historySecret?.type}
        history={historyItems}
        onInvestigate={handleInvestigate}
        onRestrict={handleRestrict} 
      />

      <CreateSecretModal open={openCreate} onClose={() => setOpenCreate(false)} onCreate={handleCreateSecret} />
      
      <SecureRevealModal
        open={revealOpen}
        onClose={() => { setRevealOpen(false); setRevealValue(""); }}
        title={revealTitle}
        subtitle={revealSubtitle}
        secretValue={revealValue}
        autoHideSeconds={30}
      />
    </div>
  );
}