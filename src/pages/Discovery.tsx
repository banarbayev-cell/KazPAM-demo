import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  listDiscoveryAccounts,
  listDiscoveryJobs,
  listDiscoveryTargets,
  onboardDiscoveryAccount,
  runDiscovery,
} from "../api/discovery";
import type {
  DiscoveredAccount,
  DiscoveryJob,
  DiscoveryTarget,
} from "../types/discovery";
import EditDiscoveryMetadataModal from "../components/modals/EditDiscoveryMetadataModal";

type ReadinessResult = {
  ready: boolean;
  reason: string;
  missing: string[];
};

type StatusFilter = "all" | "discovered" | "reviewed" | "managed" | "ignored";
type ReadinessFilter = "all" | "ready" | "not_ready";
type DiscoveryTab = "accounts" | "targets" | "jobs";
type JobStatusFilter = "all" | "completed" | "running" | "failed";

function getReadiness(account: DiscoveredAccount): ReadinessResult {
  const missing: string[] = [];

  if (account.status !== "reviewed") {
    missing.push("не reviewed");
  }
  if (!account.owner?.trim()) {
    missing.push("не указан владелец");
  }
  if (!account.linked_vault_secret_id) {
    missing.push("не привязан Vault secret");
  }
  if (!account.linked_policy_id) {
    missing.push("не привязана политика");
  }

  if (missing.length === 0) {
    return {
      ready: true,
      reason: "готов к onboarding",
      missing: [],
    };
  }

  return {
    ready: false,
    reason: missing.join(", "),
    missing,
  };
}

function statusBadgeClass(status?: string | null) {
  const normalized = (status || "").toLowerCase();

  if (
    ["managed", "completed", "success", "finished", "active"].includes(normalized)
  ) {
    return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  }

  if (
    ["reviewed", "running", "pending", "queued", "in_progress"].includes(
      normalized
    )
  ) {
    return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
  }

  if (["failed", "error", "inactive"].includes(normalized)) {
    return "bg-red-500/20 text-red-300 border border-red-500/30";
  }

  if (["ignored"].includes(normalized)) {
    return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
  }

  if (["discovered"].includes(normalized)) {
    return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
  }

  return "bg-slate-500/20 text-slate-300 border border-slate-500/30";
}

function readinessBadgeClass(ready: boolean) {
  return ready
    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
    : "bg-red-500/20 text-red-300 border border-red-500/30";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(
  startedAt?: string | null,
  finishedAt?: string | null
): string {
  if (!startedAt || !finishedAt) return "—";

  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "—";

  const totalSeconds = Math.floor((end - start) / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}с`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return `${minutes}м ${seconds}с`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}ч ${remainingMinutes}м`;
}

function getTargetDisplayName(target: DiscoveryTarget) {
  return (
    target.name ||
    target.hostname ||
    target.host ||
    target.ip_address ||
    target.address ||
    `Target ${target.id}`
  );
}

function getTargetAddress(target: DiscoveryTarget) {
  const base =
    target.host || target.hostname || target.ip_address || target.address || "—";

  if (target.port) {
    return `${base}:${target.port}`;
  }

  return base;
}

function getTargetStatus(target: DiscoveryTarget) {
  if (target.status) return target.status;
  if (target.is_active === true) return "active";
  if (target.is_active === false) return "inactive";
  return "—";
}

function getJobFoundCount(job: DiscoveryJob) {
  if (job.discovered_count != null) return job.discovered_count;
  if (job.accounts_found != null) return job.accounts_found;
  return "—";
}

function getJobSortTime(job: DiscoveryJob) {
  return new Date(
    job.started_at || job.created_at || job.updated_at || job.finished_at || 0
  ).getTime();
}

function getJobStatusGroup(status?: string | null): JobStatusFilter {
  const normalized = (status || "").toLowerCase();

  if (["completed", "success", "finished"].includes(normalized)) {
    return "completed";
  }

  if (["running", "pending", "queued", "in_progress"].includes(normalized)) {
    return "running";
  }

  if (["failed", "error"].includes(normalized)) {
    return "failed";
  }

  return "all";
}

export default function Discovery() {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>("accounts");

  const [accounts, setAccounts] = useState<DiscoveredAccount[]>([]);
  const [targets, setTargets] = useState<DiscoveryTarget[]>([]);
  const [jobs, setJobs] = useState<DiscoveryJob[]>([]);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState<DiscoveredAccount | null>(
    null
  );
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [onboardingAccountId, setOnboardingAccountId] = useState<number | null>(
    null
  );

  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [lastTriggeredJobId, setLastTriggeredJobId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [readinessFilter, setReadinessFilter] =
    useState<ReadinessFilter>("all");
  const [jobStatusFilter, setJobStatusFilter] =
    useState<JobStatusFilter>("all");

  async function loadAccounts() {
    try {
      setLoadingAccounts(true);
      const data = await listDiscoveryAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load discovery accounts", error);
      toast.error("Не удалось загрузить обнаруженные аккаунты");
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function loadTargets() {
    try {
      setLoadingTargets(true);
      const data = await listDiscoveryTargets();
      const safeTargets = Array.isArray(data) ? data : [];
      setTargets(safeTargets);

      if (!selectedTargetId && safeTargets.length > 0) {
        setSelectedTargetId(String(safeTargets[0].id));
      }
    } catch (error) {
      console.error("Failed to load discovery targets", error);
      toast.error("Не удалось загрузить discovery targets");
    } finally {
      setLoadingTargets(false);
    }
  }

  async function loadJobs() {
    try {
      setLoadingJobs(true);
      const data = await listDiscoveryJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load discovery jobs", error);
      toast.error("Не удалось загрузить discovery jobs");
    } finally {
      setLoadingJobs(false);
    }
  }

  function openMetadataModal(account: DiscoveredAccount) {
    setSelectedAccount(account);
    setIsMetadataModalOpen(true);
  }

  function closeMetadataModal() {
    setIsMetadataModalOpen(false);
    setSelectedAccount(null);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setReadinessFilter("all");
  }

  function resetJobsFilters() {
    setJobStatusFilter("all");
  }

  function openAccountsByTarget(targetId?: number | null) {
    if (!targetId) {
      toast.error("У job отсутствует target_id");
      return;
    }

    setActiveTab("accounts");
    setSearch(String(targetId));
    setStatusFilter("all");
    setReadinessFilter("all");
    toast.success(`Показаны accounts для target_id ${targetId}`);
  }

  async function handleOnboard(account: DiscoveredAccount) {
    const readiness = getReadiness(account);

    if (!readiness.ready) {
      toast.error(`Onboard недоступен: ${readiness.reason}`);
      return;
    }

    try {
      setOnboardingAccountId(account.id);
      await onboardDiscoveryAccount(account.id);
      toast.success(`Account ${account.account_name} переведен в managed`);
      await loadAccounts();
    } catch (error) {
      console.error("Failed to onboard discovery account", error);
      toast.error("Не удалось выполнить onboarding");
    } finally {
      setOnboardingAccountId(null);
    }
  }

  async function handleRunDiscovery() {
    const targetId = Number(selectedTargetId);

    if (!targetId || Number.isNaN(targetId)) {
      toast.error("Выбери target для запуска Discovery");
      return;
    }

    try {
      setRunningDiscovery(true);

      const createdJob = await runDiscovery({ target_id: targetId });

      if (createdJob?.id) {
        setLastTriggeredJobId(createdJob.id);
      }

      toast.success(`Discovery запущен для target ${targetId}`);

      await loadJobs();
      setActiveTab("jobs");
    } catch (error) {
      console.error("Failed to run discovery", error);
      toast.error("Не удалось запустить Discovery");
    } finally {
      setRunningDiscovery(false);
    }
  }

  async function handleRefresh() {
    if (activeTab === "accounts") {
      await loadAccounts();
      return;
    }

    if (activeTab === "targets") {
      await loadTargets();
      return;
    }

    await loadJobs();
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === "targets" && targets.length === 0) {
      loadTargets();
    }

    if (activeTab === "jobs" && jobs.length === 0) {
      loadJobs();
    }
  }, [activeTab, targets.length, jobs.length]);

  const accountStats = useMemo(() => {
    const total = accounts.length;
    const ready = accounts.filter((a) => getReadiness(a).ready).length;
    const managed = accounts.filter((a) => a.status === "managed").length;
    const reviewed = accounts.filter((a) => a.status === "reviewed").length;

    return { total, ready, managed, reviewed };
  }, [accounts]);

  const targetStats = useMemo(() => {
    const total = targets.length;
    const active = targets.filter((t) => getTargetStatus(t) === "active").length;
    const inactive = targets.filter(
      (t) => getTargetStatus(t) === "inactive"
    ).length;

    return { total, active, inactive };
  }, [targets]);

  const jobStats = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter((j) =>
      ["completed", "success", "finished"].includes(
        (j.status || "").toLowerCase()
      )
    ).length;
    const running = jobs.filter((j) =>
      ["running", "pending", "queued", "in_progress"].includes(
        (j.status || "").toLowerCase()
      )
    ).length;
    const failed = jobs.filter((j) =>
      ["failed", "error"].includes((j.status || "").toLowerCase())
    ).length;

    return { total, completed, running, failed };
  }, [jobs]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const readiness = getReadiness(account);

      const matchesSearch =
        query.length === 0 ||
        account.account_name?.toLowerCase().includes(query) ||
        account.owner?.toLowerCase().includes(query) ||
        account.notes?.toLowerCase().includes(query) ||
        String(account.id).includes(query) ||
        String(account.target_id).includes(query);

      const matchesStatus =
        statusFilter === "all" ? true : account.status === statusFilter;

      const matchesReadiness =
        readinessFilter === "all"
          ? true
          : readinessFilter === "ready"
          ? readiness.ready
          : !readiness.ready;

      return matchesSearch && matchesStatus && matchesReadiness;
    });
  }, [accounts, search, statusFilter, readinessFilter]);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => getJobSortTime(b) - getJobSortTime(a));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (jobStatusFilter === "all") return sortedJobs;

    return sortedJobs.filter(
      (job) => getJobStatusGroup(job.status) === jobStatusFilter
    );
  }, [sortedJobs, jobStatusFilter]);

  const latestJobId = sortedJobs.length > 0 ? sortedJobs[0].id : null;

  const tabButtonClass = (tab: DiscoveryTab) =>
    `inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition ${
      activeTab === tab
        ? "bg-[#0052FF] text-white"
        : "bg-[#0E1A3A] text-gray-300 hover:bg-[#16213D] hover:text-white border border-[#1E2A45]"
    }`;

  return (
    <>
      <div className="min-h-full bg-gray-100 -m-6 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Обнаружение</h1>
            <p className="text-gray-600 mt-2">
              Discovery module: Accounts, Targets и Jobs в одном интерфейсе.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-lg bg-[#0052FF] text-white hover:opacity-90 transition"
          >
            Обновить
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab("accounts")}
            className={tabButtonClass("accounts")}
          >
            Accounts
          </button>

          <button
            onClick={() => setActiveTab("targets")}
            className={tabButtonClass("targets")}
          >
            Targets
          </button>

          <button
            onClick={() => setActiveTab("jobs")}
            className={tabButtonClass("jobs")}
          >
            Jobs
          </button>
        </div>

        {activeTab === "accounts" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
                <div className="text-sm text-gray-400">Всего аккаунтов</div>
                <div className="text-3xl font-bold mt-2">
                  {accountStats.total}
                </div>
              </div>

              <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
                <div className="text-sm text-gray-400">Проверено</div>
                <div className="text-3xl font-bold mt-2">
                  {accountStats.reviewed}
                </div>
              </div>

              <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
                <div className="text-sm text-gray-400">Готово к onboarding</div>
                <div className="text-3xl font-bold mt-2">
                  {accountStats.ready}
                </div>
              </div>

              <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
                <div className="text-sm text-gray-400">Управляется</div>
                <div className="text-3xl font-bold mt-2">
                  {accountStats.managed}
                </div>
              </div>
            </div>

            <div className="bg-[#121A33] rounded-2xl shadow overflow-hidden border border-[#1E2A45]">
              <div className="px-5 py-4 border-b border-[#1E2A45]">
                <h2 className="text-white text-lg font-semibold">Accounts</h2>
              </div>

              <div className="border-b border-[#1E2A45] px-5 py-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Поиск
                    </label>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="account_name, owner, notes, ID, target_id"
                      className="w-full rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-[#0052FF]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Статус
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as StatusFilter)
                      }
                      className="w-full rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-4 py-3 text-white outline-none focus:border-[#0052FF]"
                    >
                      <option value="all">Все</option>
                      <option value="discovered">discovered</option>
                      <option value="reviewed">reviewed</option>
                      <option value="managed">managed</option>
                      <option value="ignored">ignored</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Готовность
                    </label>
                    <select
                      value={readinessFilter}
                      onChange={(e) =>
                        setReadinessFilter(e.target.value as ReadinessFilter)
                      }
                      className="w-full rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-4 py-3 text-white outline-none focus:border-[#0052FF]"
                    >
                      <option value="all">Все</option>
                      <option value="ready">Готов</option>
                      <option value="not_ready">Не готов</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-400">
                    Найдено:{" "}
                    <span className="text-white">{filteredAccounts.length}</span>
                  </div>

                  <button
                    onClick={resetFilters}
                    className="rounded-lg border border-[#1E2A45] bg-[#0E1A3A] px-3 py-2 text-sm text-gray-200 hover:bg-[#16213D] hover:text-white"
                  >
                    Сбросить
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#0E1A3A] text-gray-300">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">ID</th>
                      <th className="text-left px-4 py-3 font-medium">
                        Аккаунт
                      </th>
                      <th className="text-left px-4 py-3 font-medium">Тип</th>
                      <th className="text-left px-4 py-3 font-medium">
                        Привилегия
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Статус
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Владелец
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Секрет Vault
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Политика
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Готовность
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Заметки
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Действия
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingAccounts ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          Загрузка...
                        </td>
                      </tr>
                    ) : filteredAccounts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          По текущим фильтрам ничего не найдено
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map((account) => {
                        const readiness = getReadiness(account);
                        const isOnboarding = onboardingAccountId === account.id;
                        const onboardDisabled = !readiness.ready || isOnboarding;

                        return (
                          <tr
                            key={account.id}
                            className="border-t border-[#1E2A45] text-gray-200 hover:bg-[#16213D] transition"
                          >
                            <td className="px-4 py-3">{account.id}</td>

                            <td className="px-4 py-3">
                              <div className="font-medium text-white">
                                {account.account_name || "—"}
                              </div>
                              <div className="text-xs text-gray-400">
                                target_id: {account.target_id}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {account.account_type || "—"}
                            </td>

                            <td className="px-4 py-3">
                              {account.privilege_level || "—"}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                                  account.status
                                )}`}
                              >
                                {account.status}
                              </span>
                            </td>

                            <td className="px-4 py-3">{account.owner || "—"}</td>

                            <td className="px-4 py-3">
                              {account.linked_vault_secret_id ?? "—"}
                            </td>

                            <td className="px-4 py-3">
                              {account.linked_policy_id ?? "—"}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${readinessBadgeClass(
                                    readiness.ready
                                  )}`}
                                >
                                  {readiness.ready ? "ГОТОВ" : "НЕ ГОТОВ"}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {readiness.reason}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3 max-w-[260px]">
                              <div
                                className="truncate"
                                title={account.notes || ""}
                              >
                                {account.notes || "—"}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-2 min-w-[170px]">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => openMetadataModal(account)}
                                    className="inline-flex items-center rounded-lg border border-[#0052FF]/40 bg-[#0052FF]/15 px-3 py-2 text-sm font-medium text-[#3BE3FD] cursor-pointer transition hover:bg-[#0052FF] hover:text-white hover:border-[#0052FF] active:scale-[0.98]"
                                  >
                                    Редактировать
                                  </button>

                                  <button
                                    onClick={() => handleOnboard(account)}
                                    disabled={onboardDisabled}
                                    className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                                      onboardDisabled
                                        ? "cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500"
                                        : "cursor-pointer border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 active:scale-[0.98]"
                                    }`}
                                  >
                                    {isOnboarding ? "Onboarding..." : "Onboard"}
                                  </button>
                                </div>

                                {!readiness.ready && (
                                  <div className="text-xs text-amber-300">
                                    Причина: {readiness.reason}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "targets" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
                <div className="text-sm text-gray-400">Всего targets</div>
                <div className="text-3xl font-bold mt-2">
                  {targetStats.total}
                </div>
              </div>

              <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
                <div className="text-sm text-gray-400">Active</div>
                <div className="text-3xl font-bold mt-2">
                  {targetStats.active}
                </div>
              </div>

              <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
                <div className="text-sm text-gray-400">Inactive</div>
                <div className="text-3xl font-bold mt-2">
                  {targetStats.inactive}
                </div>
              </div>
            </div>

            <div className="bg-[#121A33] rounded-2xl shadow overflow-hidden border border-[#1E2A45] mb-6">
              <div className="px-5 py-4 border-b border-[#1E2A45]">
                <h2 className="text-white text-lg font-semibold">Run Discovery</h2>
              </div>

              <div className="px-5 py-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Target
                    </label>
                    <select
                      value={selectedTargetId}
                      onChange={(e) => setSelectedTargetId(e.target.value)}
                      className="w-full rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-4 py-3 text-white outline-none focus:border-[#0052FF]"
                    >
                      <option value="">Выбери target</option>
                      {targets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {getTargetDisplayName(target)} ({getTargetAddress(target)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleRunDiscovery}
                    disabled={!selectedTargetId || runningDiscovery}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                      !selectedTargetId || runningDiscovery
                        ? "cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500"
                        : "border border-[#0052FF]/40 bg-[#0052FF] text-white hover:opacity-90"
                    }`}
                  >
                    {runningDiscovery ? "Запуск..." : "Run Discovery"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#121A33] rounded-2xl shadow overflow-hidden border border-[#1E2A45]">
              <div className="px-5 py-4 border-b border-[#1E2A45]">
                <h2 className="text-white text-lg font-semibold">Targets</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#0E1A3A] text-gray-300">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">ID</th>
                      <th className="text-left px-4 py-3 font-medium">Имя</th>
                      <th className="text-left px-4 py-3 font-medium">Адрес</th>
                      <th className="text-left px-4 py-3 font-medium">Тип</th>
                      <th className="text-left px-4 py-3 font-medium">
                        Протокол
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Статус
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Создан
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingTargets ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          Загрузка...
                        </td>
                      </tr>
                    ) : targets.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          Discovery targets пока нет
                        </td>
                      </tr>
                    ) : (
                      targets.map((target) => {
                        const targetStatus = getTargetStatus(target);

                        return (
                          <tr
                            key={target.id}
                            className="border-t border-[#1E2A45] text-gray-200 hover:bg-[#16213D] transition"
                          >
                            <td className="px-4 py-3">{target.id}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-white">
                                {getTargetDisplayName(target)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {getTargetAddress(target)}
                            </td>
                            <td className="px-4 py-3">
                              {target.target_type || target.os_type || "—"}
                            </td>
                            <td className="px-4 py-3">
                              {target.protocol || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                                  targetStatus
                                )}`}
                              >
                                {targetStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {formatDateTime(
                                target.created_at || target.updated_at
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "jobs" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
                <div className="text-sm text-gray-400">Всего jobs</div>
                <div className="text-3xl font-bold mt-2">{jobStats.total}</div>
              </div>

              <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
                <div className="text-sm text-gray-400">Completed</div>
                <div className="text-3xl font-bold mt-2">
                  {jobStats.completed}
                </div>
              </div>

              <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
                <div className="text-sm text-gray-400">Running</div>
                <div className="text-3xl font-bold mt-2">
                  {jobStats.running}
                </div>
              </div>

              <div className="bg-[#121A33] text-white rounded-2xl shadow p-5">
                <div className="text-sm text-gray-400">Failed</div>
                <div className="text-3xl font-bold mt-2">
                  {jobStats.failed}
                </div>
              </div>
            </div>

            <div className="bg-[#121A33] rounded-2xl shadow overflow-hidden border border-[#1E2A45]">
              <div className="px-5 py-4 border-b border-[#1E2A45] flex items-center justify-between gap-3">
                <h2 className="text-white text-lg font-semibold">Jobs</h2>

                {lastTriggeredJobId && (
                  <span className="text-xs text-[#3BE3FD]">
                    Последний запущенный job: #{lastTriggeredJobId}
                  </span>
                )}
              </div>

              <div className="border-b border-[#1E2A45] px-5 py-4">
                <div className="grid grid-cols-1 md:grid-cols-[220px_auto] gap-3 items-end">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Фильтр status
                    </label>
                    <select
                      value={jobStatusFilter}
                      onChange={(e) =>
                        setJobStatusFilter(e.target.value as JobStatusFilter)
                      }
                      className="w-full rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-4 py-3 text-white outline-none focus:border-[#0052FF]"
                    >
                      <option value="all">Все</option>
                      <option value="completed">Completed</option>
                      <option value="running">Running / Pending</option>
                      <option value="failed">Failed / Error</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-400">
                      Найдено jobs:{" "}
                      <span className="text-white">{filteredJobs.length}</span>
                    </div>

                    <button
                      onClick={resetJobsFilters}
                      className="rounded-lg border border-[#1E2A45] bg-[#0E1A3A] px-3 py-2 text-sm text-gray-200 hover:bg-[#16213D] hover:text-white"
                    >
                      Сбросить
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#0E1A3A] text-gray-300">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">ID</th>
                      <th className="text-left px-4 py-3 font-medium">
                        Target ID
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Статус
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Created
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Started
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Finished
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Found
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Duration
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Summary
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Ошибка
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Действия
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingJobs ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          Загрузка...
                        </td>
                      </tr>
                    ) : filteredJobs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          По текущему фильтру jobs не найдено
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map((job) => {
                        const isLastTriggered = lastTriggeredJobId === job.id;
                        const isLatest = latestJobId === job.id;

                        return (
                          <tr
                            key={job.id}
                            className={`border-t border-[#1E2A45] text-gray-200 transition ${
                              isLastTriggered
                                ? "bg-[#0E2A52] hover:bg-[#12386A]"
                                : isLatest
                                ? "bg-[#16213D] hover:bg-[#1B294A]"
                                : "hover:bg-[#16213D]"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span>{job.id}</span>

                                {isLastTriggered && (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#0052FF]/20 text-[#3BE3FD] border border-[#0052FF]/30">
                                    last run
                                  </span>
                                )}

                                {!isLastTriggered && isLatest && (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    latest
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3">{job.target_id ?? "—"}</td>

                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                                  job.status
                                )}`}
                              >
                                {job.status || "—"}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {formatDateTime(job.created_at)}
                            </td>

                            <td className="px-4 py-3">
                              {formatDateTime(job.started_at)}
                            </td>

                            <td className="px-4 py-3">
                              {formatDateTime(job.finished_at)}
                            </td>

                            <td className="px-4 py-3">{getJobFoundCount(job)}</td>

                            <td className="px-4 py-3">
                              {formatDuration(job.started_at, job.finished_at)}
                            </td>

                            <td className="px-4 py-3 max-w-[240px]">
                              <div className="truncate" title={job.summary || ""}>
                                {job.summary || "—"}
                              </div>
                            </td>

                            <td className="px-4 py-3 max-w-[280px]">
                              <div
                                className={`truncate ${
                                  job.error ? "text-red-300" : ""
                                }`}
                                title={job.error || ""}
                              >
                                {job.error || "—"}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <button
                                onClick={() => openAccountsByTarget(job.target_id)}
                                className="inline-flex items-center rounded-lg border border-[#0052FF]/40 bg-[#0052FF]/15 px-3 py-2 text-sm font-medium text-[#3BE3FD] cursor-pointer transition hover:bg-[#0052FF] hover:text-white hover:border-[#0052FF] active:scale-[0.98]"
                              >
                                Accounts
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <EditDiscoveryMetadataModal
        isOpen={isMetadataModalOpen}
        account={selectedAccount}
        onClose={closeMetadataModal}
        onSaved={loadAccounts}
      />
    </>
  );
}