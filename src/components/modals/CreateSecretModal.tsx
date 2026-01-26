import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type TypeCode = "password" | "ssh_key" | "access_keys" | "api_token" | "other";
type PlatformCode =
  | "windows"
  | "linux"
  | "cisco"
  | "postgresql"
  | "mysql"
  | "aws"
  | "solaris"
  | "custom";

const TYPE_OPTIONS: { value: TypeCode; label: string; hint?: string }[] = [
  { value: "password", label: "Пароль" },
  { value: "ssh_key", label: "SSH ключ" },
  { value: "access_keys", label: "Access Keys" },
  { value: "api_token", label: "API Token" },
  { value: "other", label: "Другое" },
];

const PLATFORM_OPTIONS: { value: PlatformCode; label: string }[] = [
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
  { value: "cisco", label: "Cisco" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "aws", label: "AWS" },
  { value: "solaris", label: "Solaris" },
  { value: "custom", label: "Другое / Custom" },
];

function maskPreview(value: string) {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}••••••${value.slice(-2)}`;
}

type CreateSecretPayload = {
  system: string;
  login: string;
  type: TypeCode;
  platform: PlatformCode;
  value: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateSecretPayload) => void;
};

export default function CreateSecretModal({ open, onClose, onCreate }: Props) {
  // ✅ Hooks always run (не условно)
  const [system, setSystem] = useState("");
  const [login, setLogin] = useState("");
  const [type, setType] = useState<TypeCode>("password");
  const [platform, setPlatform] = useState<PlatformCode>("windows");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const typeLabel = useMemo(
    () => TYPE_OPTIONS.find((x) => x.value === type)?.label ?? type,
    [type]
  );

  useEffect(() => {
    // при открытии — чистый стейт
    if (!open) return;

    setError(null);
    setSystem("");
    setLogin("");
    setType("password");
    setPlatform("windows");
    setValue("");
  }, [open]);

  // ✅ UX hardening: блокируем скролл + закрытие по ESC (без влияния на API/логику)
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const handleSubmit = () => {
    const s = system.trim();
    const l = login.trim();

    if (!s || !l || !value) {
      setError("Заполните все поля: система, логин и значение секрета.");
      return;
    }

    onCreate({
      system: s,
      login: l,
      type,
      platform,
      value,
    });

    onClose();
  };

  // ✅ Render gating AFTER hooks
  if (!open) return null;

  const inputCls =
    "h-10 bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 text-gray-200 placeholder:text-gray-400 " +
    "hover:bg-[#101F45] focus:outline-none focus:ring-2 focus:ring-[#0052FF]/40";

  const selectCls =
    "h-10 w-full bg-[#0E1A3A] border border-[#1E2A45] rounded-lg px-3 pr-10 text-gray-200 " +
    "hover:bg-[#101F45] focus:outline-none focus:ring-2 focus:ring-[#0052FF]/40 appearance-none";

  // ✅ Portal: гарантированно перекрывает весь UI и блокирует клики под модалкой
  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100000]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl p-6 w-[460px] shadow-xl">
        <h2 className="text-2xl font-bold mb-1 text-white">Добавить секрет</h2>
        <p className="text-sm text-gray-300 mb-4">
          Значение будет сохранено в Vault в зашифрованном виде.
        </p>

        <div className="flex flex-col gap-3">
          <input
            className={inputCls}
            placeholder="Название системы (например: srv-ad-01)"
            value={system}
            onChange={(e) => {
              setSystem(e.target.value);
              if (error) setError(null);
            }}
          />

          <input
            className={inputCls}
            placeholder="Логин (например: administrator)"
            value={login}
            onChange={(e) => {
              setLogin(e.target.value);
              if (error) setError(null);
            }}
          />

          <div className="relative">
            <select
              className={selectCls}
              style={{ colorScheme: "dark" }}
              value={type}
              onChange={(e) => {
                setType(e.target.value as TypeCode);
                if (error) setError(null);
              }}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
              ▼
            </span>
          </div>

          <div className="relative">
            <select
              className={selectCls}
              style={{ colorScheme: "dark" }}
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value as PlatformCode);
                if (error) setError(null);
              }}
            >
              {PLATFORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
              ▼
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <input
              className={inputCls}
              placeholder={
                type === "password"
                  ? "Пароль / секрет"
                  : type === "ssh_key"
                  ? "SSH приватный ключ"
                  : type === "access_keys"
                  ? "Access Key / Secret Key"
                  : type === "api_token"
                  ? "API Token"
                  : "Значение секрета"
              }
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
            />
            <div className="text-xs text-gray-400">
              Предпросмотр:{" "}
              <span className="font-mono">{maskPreview(value)}</span>{" "}
              <span className="text-gray-500">({typeLabel})</span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/30 rounded p-2">
              {error}
            </div>
          )}

          {/* Кнопки: твои, чтобы не ломать общий стиль */}
          <button className="k-btn-primary text-white" onClick={handleSubmit}>
            Добавить
          </button>

          <button className="k-btn-secondary mt-2 text-white" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}