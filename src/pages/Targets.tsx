import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import Access from "@/components/Access";
import { useAuth } from "@/store/auth";
import {
  bindTargetVaultSecret,
  createTarget,
  listTargets,
  unbindTargetVaultSecret,
  updateTarget,
} from "@/api/targets";
import { startRdpSession } from "@/api/rdp";
import { launchWebAccess } from "@/api/webAccess";
import { launchDbAccess } from "@/api/dbAccess";
import { launchVncAccess } from "@/api/vncAccess";
import type {
  Target,
  TargetCreatePayload,
  TargetUpdatePayload,
  SSHAuthMode,
  TargetProtocol,
} from "@/types/targets";


type TargetFormState = {
  name: string;
  host: string;
  port: string;
  os_type: string;
  protocol: TargetProtocol;
  ssh_auth_mode: SSHAuthMode;
  username: string;
  vault_secret_id: string;
  requires_vault_secret: boolean;
  approval_required: boolean;
  break_glass_enabled: boolean;
  break_glass_ttl_minutes: string;
  break_glass_requires_reason: boolean;
  gateway_node: string;
  is_active: boolean;
  description: string;
};

const emptyForm: TargetFormState = {
  name: "",
  host: "",
  port: "22",
  os_type: "linux",
  protocol: "ssh",
  ssh_auth_mode: "gateway_key",
  username: "",
  vault_secret_id: "",
  requires_vault_secret: false,
  approval_required: false,
  break_glass_enabled: false,
  break_glass_ttl_minutes: "15",
  break_glass_requires_reason: true,
  gateway_node: "",
  is_active: true,
  description: "",
};

function extractErrorMessage(error: any): string {
  return (
    error?.message ||
    error?.detail ||
    error?.response?.data?.detail ||
    "Неизвестная ошибка"
  );
}

function formFromTarget(target: Target): TargetFormState {
  return {
    name: target.name ?? "",
    host: target.host ?? "",
    port: String(target.port ?? 22),
    os_type: target.os_type ?? "linux",
    protocol: toTargetProtocol(target.protocol ?? "ssh"),
    ssh_auth_mode: target.ssh_auth_mode ?? "gateway_key",
    username: target.username ?? "",
    vault_secret_id:
      target.vault_secret_id !== null && target.vault_secret_id !== undefined
        ? String(target.vault_secret_id)
        : "",
    requires_vault_secret: Boolean(target.requires_vault_secret),
    approval_required: Boolean(target.approval_required),
    break_glass_enabled: Boolean(target.break_glass_enabled),
    break_glass_ttl_minutes: String(target.break_glass_ttl_minutes ?? 15),
    break_glass_requires_reason: Boolean(target.break_glass_requires_reason),
    gateway_node: target.gateway_node ?? "",
    is_active: Boolean(target.is_active),
    description: target.description ?? "",
  };
}

function normalizeTtl(raw: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 15;
  return Math.max(1, Math.min(240, parsed));
}

function toTargetProtocol(value: string): TargetProtocol {
  const normalized = (value || "").trim().toLowerCase();

  if (normalized === "rdp") return "rdp";
  if (normalized === "https") return "https";
  if (normalized === "mssql") return "mssql";
  if (normalized === "vnc") return "vnc";
  return "ssh";
}

type TargetProtocolFilter = "all" | "ssh" | "rdp" | "https" | "mssql" | "vnc";

function defaultPortForProtocol(protocol: string): number {
  switch ((protocol || "").toLowerCase()) {
    case "rdp":
      return 3389;
    case "https":
      return 443;
    case "mssql":
      return 1433;  
    case "vnc":
      return 5900;  
    case "ssh":
    default:
      return 22;
  }
}

function nextSuggestedPort(nextProtocol: string, currentPort: string): string {
  const protocol = (nextProtocol || "").toLowerCase();

  if (protocol === "rdp") {
    return currentPort === "22" || currentPort === "443" || currentPort === "1433" || currentPort === "5900"
      ? "3389"
      : currentPort;
  }

  if (protocol === "https") {
    return currentPort === "22" || currentPort === "3389" || currentPort === "1433" || currentPort === "5900"
      ? "443"
      : currentPort;
  }

  if (protocol === "mssql") {
    return currentPort === "22" || currentPort === "3389" || currentPort === "443" || currentPort === "5900"
      ? "1433"
      : currentPort;
  }

  if (protocol === "vnc") {
    return currentPort === "22" || currentPort === "3389" || currentPort === "443" || currentPort === "1433"
      ? "5900"
      : currentPort;
  }

  return currentPort === "3389" || currentPort === "443" || currentPort === "1433" || currentPort === "5900"
    ? "22"
    : currentPort;
}


function buildPayload(form: TargetFormState): TargetCreatePayload {
  const protocol = toTargetProtocol(form.protocol);

  return {
    name: form.name.trim(),
    host: form.host.trim(),
    port: Number(form.port) || defaultPortForProtocol(protocol),
    os_type: form.os_type.trim() || "linux",
    protocol,
    ssh_auth_mode: form.ssh_auth_mode,
    username: form.username.trim() || undefined,
    requires_vault_secret: form.requires_vault_secret,
    approval_required: form.approval_required,
    break_glass_enabled: form.break_glass_enabled,
    break_glass_ttl_minutes: normalizeTtl(form.break_glass_ttl_minutes),
    break_glass_requires_reason: form.break_glass_requires_reason,
    gateway_node: form.gateway_node.trim() || undefined,
    is_active: form.is_active,
    description: form.description.trim() || undefined,
  };
}

function buildUpdatePayload(form: TargetFormState): TargetUpdatePayload {
  const protocol = toTargetProtocol(form.protocol);

  return {
    name: form.name.trim(),
    host: form.host.trim(),
    port: Number(form.port) || defaultPortForProtocol(protocol),
    os_type: form.os_type.trim() || "linux",
    protocol,
    ssh_auth_mode: form.ssh_auth_mode,
    username: form.username.trim() || undefined,
    requires_vault_secret: form.requires_vault_secret,
    approval_required: form.approval_required,
    break_glass_enabled: form.break_glass_enabled,
    break_glass_ttl_minutes: normalizeTtl(form.break_glass_ttl_minutes),
    break_glass_requires_reason: form.break_glass_requires_reason,
    gateway_node: form.gateway_node.trim() || undefined,
    is_active: form.is_active,
    description: form.description.trim() || undefined,
  };
}

function securityChip(
  text: string,
  tone: "blue" | "cyan" | "green" | "red" | "gray"
) {
  const map = {
    blue: "bg-[#0E1A3A] text-[#6EA8FF] border-[#1E2A45]",
    cyan: "bg-[#0E1A3A] text-[#3BE3FD] border-[#1E2A45]",
    green: "bg-green-900/30 text-green-300 border-green-700/40",
    red: "bg-red-900/30 text-red-300 border-red-700/40",
    gray: "bg-[#0E1A3A] text-gray-300 border-[#1E2A45]",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${map[tone]}`}
    >
      {text}
    </span>
  );
}

export default function Targets() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  const canManageTargets = Boolean(
    user?.permissions?.includes("manage_settings")
  );
  const canStartRdp = Boolean(user?.permissions?.includes("start_rdp_session"));
  const canOpenHttps = Boolean(
    user?.permissions?.includes("start_session") ||
    user?.permissions?.includes("manage_settings")
  );

  const canRequestVaultAccess = Boolean(
    user?.permissions?.includes("request_vault_access")
  );

  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<TargetProtocolFilter>("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<TargetFormState>(emptyForm);

  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [editForm, setEditForm] = useState<TargetFormState>(emptyForm);

  const [breakGlassTarget, setBreakGlassTarget] = useState<Target | null>(null);
  const [breakGlassReason, setBreakGlassReason] = useState("");
  const [breakGlassSubmitting, setBreakGlassSubmitting] = useState(false);

  const [dbBreakGlassTarget, setDbBreakGlassTarget] = useState<Target | null>(null);
  const [dbBreakGlassReason, setDbBreakGlassReason] = useState("");
  const [dbBreakGlassSubmitting, setDbBreakGlassSubmitting] = useState(false);

  const [vncBreakGlassTarget, setVncBreakGlassTarget] = useState<Target | null>(null);
  const [vncBreakGlassReason, setVncBreakGlassReason] = useState("");
  const [vncBreakGlassSubmitting, setVncBreakGlassSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listTargets();
      setTargets(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(extractErrorMessage(e) || "Ошибка загрузки targets");
      setTargets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredTargets = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (Array.isArray(targets) ? targets : [])
      .filter((t) => {
        if (protocolFilter === "all") return true;
        return (t.protocol || "").toLowerCase() === protocolFilter;
      })
      .filter((t) => {
        if (!q) return true;

        return (
          String(t.id).includes(q) ||
          (t.name || "").toLowerCase().includes(q) ||
          (t.host || "").toLowerCase().includes(q) ||
          (t.username || "").toLowerCase().includes(q) ||
          (t.protocol || "").toLowerCase().includes(q)
        );
      });
  }, [targets, search, protocolFilter]);

  function openCreate() {
    setCreateForm(emptyForm);
    setShowCreateModal(true);
  }

  function openEdit(target: Target) {
    setEditingTarget(target);
    setEditForm(formFromTarget(target));
  }

  function closeEdit() {
    setEditingTarget(null);
    setEditForm(emptyForm);
  }

  async function handleCreate() {
    if (!createForm.name.trim() || !createForm.host.trim()) {
      toast.error("Укажите name и host");
      return;
    }

    setSubmitting(true);
    try {
      const desiredSecretId = Number(createForm.vault_secret_id);

      const created = await createTarget(buildPayload(createForm));

      if (Number.isFinite(desiredSecretId) && desiredSecretId > 0) {
        await bindTargetVaultSecret(created.id, desiredSecretId);
      }

      toast.success("Target создан");
      setShowCreateModal(false);
      setCreateForm(emptyForm);
      await load();
    } catch (e: any) {
      toast.error(extractErrorMessage(e) || "Ошибка создания target");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editingTarget) return;

    if (!editForm.name.trim() || !editForm.host.trim()) {
      toast.error("Укажите name и host");
      return;
    }

    setSubmitting(true);
    try {
      const desiredSecretId = Number(editForm.vault_secret_id);
      const currentSecretId = editingTarget.vault_secret_id ?? null;

      await updateTarget(editingTarget.id, buildUpdatePayload(editForm));

      if (Number.isFinite(desiredSecretId) && desiredSecretId > 0) {
        if (currentSecretId !== desiredSecretId) {
          await bindTargetVaultSecret(editingTarget.id, desiredSecretId);
        }
      } else if (currentSecretId) {
        await unbindTargetVaultSecret(editingTarget.id);
      }

      toast.success("Target обновлён");
      closeEdit();
      await load();
    } catch (e: any) {
      toast.error(extractErrorMessage(e) || "Ошибка обновления target");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartRdp(target: Target) {
    try {
      const session = await startRdpSession({ target_id: target.id });
      toast.success(`RDP launch создан · session #${session.id}`);
      await load();
    } catch (e: any) {
      const message = extractErrorMessage(e);

      if (
        message.includes("Target requires an active approval grant before launch")
      ) {
        toast.error("Для этого target нужен approval. Нажмите «Запросить approval».");
        return;
      }

      if (message.includes("Target requires a bound vault secret before launch")) {
        toast.error("Для этого target сначала нужно привязать Vault secret.");
        return;
      }

      toast.error(message || "Ошибка запуска RDP");
    }
  }

  async function handleOpenHttps(
    target: Target,
    options?: {
      break_glass_requested?: boolean;
      break_glass_reason?: string;
    }
  ) {
    try {
      const result = await launchWebAccess(target.id, {
        break_glass_requested: options?.break_glass_requested ?? false,
        break_glass_reason: options?.break_glass_reason?.trim() || undefined,
      });

      const opened = window.open(
        result.launch_url,
        "_blank",
        "noopener,noreferrer"
      );

      if (!opened) {
        toast.success("HTTPS URL подготовлен, но браузер заблокировал новую вкладку.");
        return;
      }

      toast.success(
        result.break_glass
          ? `HTTPS break-glass access открыт · target #${target.id}`
          : `HTTPS access открыт · target #${target.id}`
      );

      await load();
    } catch (e: any) {
      const message = extractErrorMessage(e);

      if (
        message.includes("Target requires an active approval grant before launch")
      ) {
        toast.error("Для этого HTTPS target нужен approval. Нажмите «Запросить approval».");
        return;
      }

      if (
        message.includes("Target requires a bound vault secret and active approval before launch")
      ) {
        toast.error("Для этого HTTPS target сначала нужен привязанный Vault secret.");
        return;
      }

      if (message.includes("Target is disabled")) {
        toast.error("Target отключён.");
        return;
      }

      if (message.includes("Permission denied: use_break_glass")) {
        toast.error("У вас нет права use_break_glass.");
        return;
      }

      if (message.includes("Break-glass is not enabled for this target")) {
        toast.error("Для этого target break-glass не включён.");
        return;
      }

      if (message.includes("Break-glass reason is required")) {
        toast.error("Для break-glass нужно указать причину.");
        return;
      }

      toast.error(message || "Ошибка открытия HTTPS access");
    }
  }

  async function handleOpenHttpsBreakGlass() {
    if (!breakGlassTarget) return;

    const reason = breakGlassReason.trim();
    if (!reason) {
      toast.error("Укажите причину break-glass.");
      return;
    }

    setBreakGlassSubmitting(true);
    try {
      await handleOpenHttps(breakGlassTarget, {
        break_glass_requested: true,
        break_glass_reason: reason,
      });

      setBreakGlassTarget(null);
      setBreakGlassReason("");
    } finally {
      setBreakGlassSubmitting(false);
    }
  }

  async function handleOpenMssql(
    target: Target,
    options?: {
      break_glass_requested?: boolean;
      break_glass_reason?: string;
    }
  ) {
    try {
      const result = await launchDbAccess(target.id, {
        break_glass_requested: options?.break_glass_requested ?? false,
        break_glass_reason: options?.break_glass_reason?.trim() || undefined,
      });

      await navigator.clipboard.writeText(result.connection_string_stub);

      toast.success(
        result.break_glass
          ? `MS SQL break-glass подготовлен · target #${target.id}`
          : `MS SQL connection подготовлен · target #${target.id}`
      );

      await load();
    } catch (e: any) {
      const message = extractErrorMessage(e);

      if (
        message.includes("Target requires an active approval grant before launch")
      ) {
        toast.error("Для этого MS SQL target нужен approval. Нажмите «Запросить approval».");
        return;
      }

      if (
        message.includes("Target requires a bound vault secret and active approval before launch")
      ) {
        toast.error("Для этого MS SQL target сначала нужен привязанный Vault secret.");
        return;
      }

      if (message.includes("Target is disabled")) {
        toast.error("Target отключён.");
        return;
      }

      if (message.includes("Permission denied: use_break_glass")) {
        toast.error("У вас нет права use_break_glass.");
        return;
      }

      if (message.includes("Break-glass is not enabled for this target")) {
        toast.error("Для этого MS SQL target break-glass не включён.");
        return;
      }

      if (message.includes("Break-glass reason is required")) {
        toast.error("Для break-glass нужно указать причину.");
        return;
      }

      toast.error(message || "Ошибка подготовки MS SQL access");
    }
  }

  async function handleOpenMssqlBreakGlass() {
    if (!dbBreakGlassTarget) return;

    const reason = dbBreakGlassReason.trim();
    if (!reason) {
      toast.error("Укажите причину break-glass.");
      return;
    }

    setDbBreakGlassSubmitting(true);
    try {
      await handleOpenMssql(dbBreakGlassTarget, {
        break_glass_requested: true,
        break_glass_reason: reason,
      });

      setDbBreakGlassTarget(null);
      setDbBreakGlassReason("");
    } finally {
      setDbBreakGlassSubmitting(false);
    }
  }

async function handleOpenVnc(
  target: Target,
  options?: {
    break_glass_requested?: boolean;
    break_glass_reason?: string;
  }
) {
  try {
    const result = await launchVncAccess(target.id, {
      break_glass_requested: options?.break_glass_requested ?? false,
      break_glass_reason: options?.break_glass_reason?.trim() || undefined,
    });

    await navigator.clipboard.writeText(`${result.launch_host}:${result.launch_port}`);

    toast.success(
      result.break_glass
        ? `VNC break-glass подготовлен · target #${target.id}`
        : `VNC access подготовлен · target #${target.id}`
    );

    await load();
  } catch (e: any) {
    const message = extractErrorMessage(e);

    if (
      message.includes("Target requires an active approval grant before launch")
    ) {
      toast.error("Для этого VNC target нужен approval. Нажмите «Запросить approval».");
      return;
    }

    if (
      message.includes("Target requires a bound vault secret and active approval before launch")
    ) {
      toast.error("Для этого VNC target сначала нужен привязанный Vault secret.");
      return;
    }

    if (message.includes("Target is disabled")) {
      toast.error("Target отключён.");
      return;
    }

    if (message.includes("Permission denied: use_break_glass")) {
      toast.error("У вас нет права use_break_glass.");
      return;
    }

    if (message.includes("Break-glass is not enabled for this target")) {
      toast.error("Для этого VNC target break-glass не включён.");
      return;
    }

    if (message.includes("Break-glass reason is required")) {
      toast.error("Для break-glass нужно указать причину.");
      return;
    }

    toast.error(message || "Ошибка подготовки VNC access");
  }
}

async function handleOpenVncBreakGlass() {
  if (!vncBreakGlassTarget) return;

  const reason = vncBreakGlassReason.trim();
  if (!reason) {
    toast.error("Укажите причину break-glass.");
    return;
  }

  setVncBreakGlassSubmitting(true);
  try {
    await handleOpenVnc(vncBreakGlassTarget, {
      break_glass_requested: true,
      break_glass_reason: reason,
    });

    setVncBreakGlassTarget(null);
    setVncBreakGlassReason("");
  } finally {
    setVncBreakGlassSubmitting(false);
  }
}


  function handleRequestApproval(target: Target) {
    if (!target.vault_secret_id) {
      toast.error("Для этого target не привязан Vault secret");
      return;
    }

    const qs = new URLSearchParams({
      secret_id: String(target.vault_secret_id),
      open_create: "1",
      target_id: String(target.id),
      target_name: target.name,
    });

    navigate(`/vault/requests?${qs.toString()}`);
  }

  return (
    <Access permission="manage_settings">
      <div className="p-6 w-full bg-gray-100 text-black min-h-screen space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Targets · Управление доступом</h1>
            <p className="text-sm text-gray-600 mt-1">
              Target-centric доступ, привязка Vault secret и approval/JIT semantics
            </p>
          </div>

          {canManageTargets && (
            <button
              onClick={openCreate}
              className="px-4 py-2 rounded bg-[#0052FF] hover:bg-[#0046D8] text-white text-sm"
            >
              + Добавить target
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск: name / host / username / protocol / id…"
            className="w-80 bg-white text-black border p-2 rounded"
          />

          <select
            value={protocolFilter}
            onChange={(e) =>
              setProtocolFilter(e.target.value as TargetProtocolFilter)
            }
            className="border rounded-md px-3 py-2 text-sm bg-white text-black"
          >
            <option value="all">Все протоколы</option>
            <option value="ssh">SSH</option>
            <option value="rdp">RDP</option>
            <option value="https">HTTPS</option>
            <option value="mssql">MS SQL</option>
            <option value="vnc">VNC</option>
          </select>

          <div className="ml-auto text-sm text-gray-600">
            Targets:{" "}
            <span className="font-semibold text-gray-900">
              {filteredTargets.length}
            </span>{" "}
            из <span className="font-semibold text-gray-900">{targets.length}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#1E2A45] shadow-lg bg-[#121A33]">
          <table className="w-full text-sm text-white">
            <thead className="bg-[#1A243F] text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Host</th>
                <th className="px-4 py-3 text-left">Protocol</th>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">Vault</th>
                <th className="px-4 py-3 text-left">Security</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-300">
                    Загрузка…
                  </td>
                </tr>
              )}

              {!loading && filteredTargets.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-300">
                    Targets не найдены
                  </td>
                </tr>
              )}

              {!loading &&
                filteredTargets.map((target) => (
                  <tr
                    key={target.id}
                    className="border-t border-[#1E2A45] hover:bg-[#0E1A3A] transition"
                  >
                    <td className="px-4 py-3">{target.id}</td>
                    <td className="px-4 py-3 font-medium">{target.name}</td>
                    <td className="px-4 py-3">
                      {target.host}:{target.port}
                    </td>
                    <td className="px-4 py-3 uppercase">{target.protocol}</td>
                    <td className="px-4 py-3">{target.username || "—"}</td>
                    <td className="px-4 py-3">
                      {target.vault_secret_id ? (
                        <span className="text-[#3BE3FD]">
                          Secret #{target.vault_secret_id}
                        </span>
                      ) : (
                        <span className="text-gray-400">Не привязан</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {target.requires_vault_secret
                          ? securityChip("Vault required", "cyan")
                          : securityChip("Vault optional", "gray")}

                        {target.approval_required
                          ? securityChip("Approval required", "blue")
                          : securityChip("No approval", "gray")}

                        {target.break_glass_enabled
                          ? securityChip(
                              `Break-glass ${target.break_glass_ttl_minutes}m`,
                              "red"
                            )
                          : securityChip("No break-glass", "gray")}

                        {target.break_glass_enabled &&
                        target.break_glass_requires_reason
                          ? securityChip("Reason required", "red")
                          : null}

                        {target.protocol === "ssh"
                          ? securityChip(`SSH ${target.ssh_auth_mode}`, "gray")
                          : null}

                        {target.protocol === "https"
                          ? securityChip("HTTPS web target", "blue")
                          : null}  

                        {target.protocol === "mssql"
                          ? securityChip("MS SQL target", "blue")
                          : null}  

                        {target.protocol === "vnc"
                          ? securityChip("VNC target", "blue")
                          : null}  
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {target.is_active
                        ? securityChip("Active", "green")
                        : securityChip("Disabled", "red")}
                    </td>
                    <td className="px-4 py-3 text-gray-200">{target.updated_at}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => openEdit(target)}
                          className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-xs"
                        >
                          Edit
                        </button>

                        {target.protocol === "rdp" && canStartRdp && (
                          <button
                            onClick={() => handleStartRdp(target)}
                            disabled={!target.is_active}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs"
                          >
                            Запустить RDP
                          </button>
                        )}

                        {target.approval_required && canRequestVaultAccess && (
                          <button
                            onClick={() => handleRequestApproval(target)}
                            className="px-3 py-1 rounded bg-[#0052FF] hover:bg-[#0046D8] text-white text-xs"
                          >
                            Запросить approval
                          </button>
                        )}

                        {target.protocol === "https" && canOpenHttps && (
                          <button
                            onClick={() => handleOpenHttps(target)}
                            disabled={!target.is_active}
                            className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs"
                          >
                            Открыть HTTPS
                          </button>
                        )}

                        {target.protocol === "https" && target.break_glass_enabled && canOpenHttps && (
                          <button
                            onClick={() => {
                              setBreakGlassTarget(target);
                              setBreakGlassReason("");
                            }}
                            disabled={!target.is_active}
                            className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs"
                          >
                            Break-glass
                          </button>
                        )}

                        {target.protocol === "mssql" && canOpenHttps && (
                          <button
                            onClick={() => handleOpenMssql(target)}
                            disabled={!target.is_active}
                            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs"
                          >
                            Подготовить MS SQL
                          </button>
                        )}

                        {target.protocol === "mssql" && target.break_glass_enabled && canOpenHttps && (
                          <button
                            onClick={() => {
                              setDbBreakGlassTarget(target);
                              setDbBreakGlassReason("");
                            }}
                            disabled={!target.is_active}
                            className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs"
                          >
                            Break-glass DB
                          </button>
                        )}

                        {target.protocol === "vnc" && canOpenHttps && (
                          <button
                            onClick={() => handleOpenVnc(target)}
                            disabled={!target.is_active}
                            className="px-3 py-1 rounded bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs"
                          >
                            Подготовить VNC
                          </button>
                        )}

                        {target.protocol === "vnc" && target.break_glass_enabled && canOpenHttps && (
                          <button
                            onClick={() => {
                              setVncBreakGlassTarget(target);
                              setVncBreakGlassReason("");
                           }}
                            disabled={!target.is_active}
                            className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs"
                          >
                            Break-glass VNC
                          </button>
                        )} 
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-[#121A33] p-6 rounded-xl border border-[#1E2A45] w-[760px] max-w-[95vw] space-y-4">
              <h2 className="text-lg font-semibold text-white">Создать target</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Name</label>
                  <input
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, name: e.target.value }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    placeholder="rdp-test-1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Host</label>
                  <input
                    value={createForm.host}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, host: e.target.value }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    placeholder="10.10.10.20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Port</label>
                  <input
                    value={createForm.port}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, port: e.target.value }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    placeholder="3389"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Username</label>
                  <input
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, username: e.target.value }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    placeholder="Administrator"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">OS Type</label>
                  <select
                    value={createForm.os_type}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, os_type: e.target.value }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                  >
                    <option value="linux">linux</option>
                    <option value="windows">windows</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Protocol</label>
                  <select
                    value={createForm.protocol}
                    onChange={(e) =>
                      setCreateForm((s) => {
                        const protocol = toTargetProtocol(e.target.value);
                        
                        return {
                          ...s,
                          protocol,
                          port: nextSuggestedPort(protocol, s.port),
                         }; 
                      })
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                  >
                    <option value="ssh">ssh</option>
                    <option value="rdp">rdp</option>
                    <option value="https">https</option>
                    <option value="mssql">mssql</option>
                    <option value="vnc">vnc</option>
                  </select>
                </div>

                {createForm.protocol === "ssh" && (
                  <div className="space-y-2">
                    <label className="text-sm text-gray-300">SSH Auth Mode</label>
                    <select
                      value={createForm.ssh_auth_mode}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          ssh_auth_mode: e.target.value as SSHAuthMode,
                        }))
                      }
                      className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    >
                      <option value="gateway_key">gateway_key</option>
                      <option value="vault_password">vault_password</option>
                      <option value="vault_private_key">vault_private_key</option>
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Vault Secret ID</label>
                  <input
                    value={createForm.vault_secret_id}
                    onChange={(e) =>
                      setCreateForm((s) => ({
                        ...s,
                        vault_secret_id: e.target.value,
                      }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    placeholder="например: 17"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Gateway Node</label>
                  <input
                    value={createForm.gateway_node}
                    onChange={(e) =>
                      setCreateForm((s) => ({
                        ...s,
                        gateway_node: e.target.value,
                      }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    placeholder="необязательно"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-sm text-gray-300">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm((s) => ({
                        ...s,
                        description: e.target.value,
                      }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    placeholder="Описание target"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-200">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createForm.requires_vault_secret}
                    onChange={(e) =>
                      setCreateForm((s) => ({
                        ...s,
                        requires_vault_secret: e.target.checked,
                      }))
                    }
                  />
                  Vault secret required
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createForm.approval_required}
                    onChange={(e) =>
                      setCreateForm((s) => ({
                        ...s,
                        approval_required: e.target.checked,
                      }))
                    }
                  />
                  Approval required
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createForm.is_active}
                    onChange={(e) =>
                      setCreateForm((s) => ({
                        ...s,
                        is_active: e.target.checked,
                      }))
                    }
                  />
                  Active
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={createForm.break_glass_enabled}
                    onChange={(e) =>
                      setCreateForm((s) => ({
                        ...s,
                        break_glass_enabled: e.target.checked,
                      }))
                    }
                  />
                  Break-glass enabled
                </label>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">
                    Break-glass TTL (minutes)
                  </label>
                  <input
                    value={createForm.break_glass_ttl_minutes}
                    onChange={(e) =>
                      setCreateForm((s) => ({
                        ...s,
                        break_glass_ttl_minutes: e.target.value,
                      }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    placeholder="15"
                    disabled={!createForm.break_glass_enabled}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={createForm.break_glass_requires_reason}
                    onChange={(e) =>
                      setCreateForm((s) => ({
                        ...s,
                        break_glass_requires_reason: e.target.checked,
                      }))
                    }
                    disabled={!createForm.break_glass_enabled}
                  />
                  Reason required
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm"
                >
                  Отмена
                </button>

                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="px-3 py-1 rounded bg-[#0052FF] hover:bg-[#0046D8] disabled:bg-gray-600 text-white text-sm"
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        )}

        {editingTarget && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-[#121A33] p-6 rounded-xl border border-[#1E2A45] w-[760px] max-w-[95vw] space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Редактировать target #{editingTarget.id}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Name</label>
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((s) => ({ ...s, name: e.target.value }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Host</label>
                  <input
                    value={editForm.host}
                    onChange={(e) =>
                      setEditForm((s) => ({ ...s, host: e.target.value }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Port</label>
                  <input
                    value={editForm.port}
                    onChange={(e) =>
                      setEditForm((s) => ({ ...s, port: e.target.value }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Username</label>
                  <input
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm((s) => ({ ...s, username: e.target.value }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">OS Type</label>
                  <select
                    value={editForm.os_type}
                    onChange={(e) =>
                      setEditForm((s) => ({ ...s, os_type: e.target.value }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                  >
                    <option value="linux">linux</option>
                    <option value="windows">windows</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Protocol</label>
                  <select
                    value={editForm.protocol}
                    onChange={(e) =>
                      setEditForm((s) => {
                        const protocol = toTargetProtocol(e.target.value);

                        return {
                          ...s,
                          protocol,
                          port: nextSuggestedPort(protocol, s.port),
                        };  
                      })
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                  >
                    <option value="ssh">ssh</option>
                    <option value="rdp">rdp</option>
                    <option value="https">https</option>
                    <option value="mssql">mssql</option>
                    <option value="vnc">vnc</option>
                  </select>
                </div>

                {editForm.protocol === "ssh" && (
                  <div className="space-y-2">
                    <label className="text-sm text-gray-300">SSH Auth Mode</label>
                    <select
                      value={editForm.ssh_auth_mode}
                      onChange={(e) =>
                        setEditForm((s) => ({
                          ...s,
                          ssh_auth_mode: e.target.value as SSHAuthMode,
                        }))
                      }
                      className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    >
                      <option value="gateway_key">gateway_key</option>
                      <option value="vault_password">vault_password</option>
                      <option value="vault_private_key">vault_private_key</option>
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Vault Secret ID</label>
                  <input
                    value={editForm.vault_secret_id}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        vault_secret_id: e.target.value,
                      }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    placeholder="например: 17"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Gateway Node</label>
                  <input
                    value={editForm.gateway_node}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        gateway_node: e.target.value,
                      }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-sm text-gray-300">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        description: e.target.value,
                      }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-200">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.requires_vault_secret}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        requires_vault_secret: e.target.checked,
                      }))
                    }
                  />
                  Vault secret required
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.approval_required}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        approval_required: e.target.checked,
                      }))
                    }
                  />
                  Approval required
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        is_active: e.target.checked,
                      }))
                    }
                  />
                  Active
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={editForm.break_glass_enabled}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        break_glass_enabled: e.target.checked,
                      }))
                    }
                  />
                  Break-glass enabled
                </label>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">
                    Break-glass TTL (minutes)
                  </label>
                  <input
                    value={editForm.break_glass_ttl_minutes}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        break_glass_ttl_minutes: e.target.value,
                      }))
                    }
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    placeholder="15"
                    disabled={!editForm.break_glass_enabled}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={editForm.break_glass_requires_reason}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        break_glass_requires_reason: e.target.checked,
                      }))
                    }
                    disabled={!editForm.break_glass_enabled}
                  />
                  Reason required
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closeEdit}
                  className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm"
                >
                  Отмена
                </button>

                <button
                  onClick={handleUpdate}
                  disabled={submitting}
                  className="px-3 py-1 rounded bg-[#0052FF] hover:bg-[#0046D8] disabled:bg-gray-600 text-white text-sm"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}
        {breakGlassTarget && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-[#121A33] p-6 rounded-xl border border-[#1E2A45] w-[560px] max-w-[95vw] space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Break-glass · HTTPS target #{breakGlassTarget.id}
              </h2>

              <div className="text-sm text-gray-300 space-y-1">
                <div>
                  <span className="text-gray-400">Target:</span>{" "}
                  {breakGlassTarget.name}
                </div>
                <div>
                  <span className="text-gray-400">Host:</span>{" "}
                  {breakGlassTarget.host}:{breakGlassTarget.port}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">
                  Причина break-glass
                </label>
                <textarea
                  value={breakGlassReason}
                  onChange={(e) => setBreakGlassReason(e.target.value)}
                  className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                  placeholder="Например: аварийный доступ к критичному веб-интерфейсу"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setBreakGlassTarget(null);
                    setBreakGlassReason("");
                  }}
                  className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm"
                >
                  Отмена
                </button>

                <button
                  onClick={handleOpenHttpsBreakGlass}
                  disabled={breakGlassSubmitting}
                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm"
                >
                  Открыть через Break-glass
                </button>
              </div>
            </div>
          </div>
        )}
        {dbBreakGlassTarget && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-[#121A33] p-6 rounded-xl border border-[#1E2A45] w-[560px] max-w-[95vw] space-y-4">
              <h2 className="text-lg font-semibold text-white">
              Break-glass · MS SQL target #{dbBreakGlassTarget.id}
              </h2>

            <div className="text-sm text-gray-300 space-y-1">
              <div>
                <span className="text-gray-400">Target:</span>{" "}
                {dbBreakGlassTarget.name}
              </div>
            <div>
              <span className="text-gray-400">Host:</span>{" "}
              {dbBreakGlassTarget.host}:{dbBreakGlassTarget.port}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">
              Причина break-glass
            </label>
            <textarea
              value={dbBreakGlassReason}
              onChange={(e) => setDbBreakGlassReason(e.target.value)}
              className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
              placeholder="Например: аварийный доступ к критичной БД"
             />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
              setDbBreakGlassTarget(null);
              setDbBreakGlassReason("");
            }}
            className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm"
            >
            Отмена
            </button>

            <button
              onClick={handleOpenMssqlBreakGlass}
              disabled={dbBreakGlassSubmitting}
              className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm"
            >
              Подготовить через Break-glass
            </button>
          </div>
         </div>
        </div>
        )}
        {vncBreakGlassTarget && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-[#121A33] p-6 rounded-xl border border-[#1E2A45] w-[560px] max-w-[95vw] space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Break-glass · VNC target #{vncBreakGlassTarget.id}
              </h2>

              <div className="text-sm text-gray-300 space-y-1">
                <div>
                  <span className="text-gray-400">Target:</span>{" "}
                  {vncBreakGlassTarget.name}
                </div>
                <div>
                  <span className="text-gray-400">Host:</span>{" "}
                  {vncBreakGlassTarget.host}:{vncBreakGlassTarget.port}
                </div>
               </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">
                    Причина break-glass
                  </label>
                  <textarea
                    value={vncBreakGlassReason}
                    onChange={(e) => setVncBreakGlassReason(e.target.value)}
                    className="w-full p-2 rounded bg-[#0E1A3A] border border-[#1E2A45] text-white"
                    placeholder="Например: аварийный доступ к VNC консоли"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setVncBreakGlassTarget(null);
                      setVncBreakGlassReason("");
                    }}
                    className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm"
                  >
                    Отмена
                  </button>

                  <button
                    onClick={handleOpenVncBreakGlass}
                    disabled={vncBreakGlassSubmitting}
                    className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm"
                  >
                    Подготовить через Break-glass
                  </button>
                 </div>
                </div>
               </div>
              )}
        </div>
      </Access>
    );
  }