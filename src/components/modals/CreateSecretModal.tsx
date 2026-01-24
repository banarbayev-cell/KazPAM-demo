import { useEffect, useMemo, useState } from "react";

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
  // лёгкая маска, чтобы не светить секрет полностью
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}••••••${value.slice(-2)}`;
}

export default function CreateSecretModal({ open, onClose, onCreate }: any) {
  if (!open) return null;

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
    // при открытии — чистый стейт (без сюрпризов при повторном открытии)
    if (open) {
      setError(null);
      setSystem("");
      setLogin("");
      setType("password");
      setPlatform("windows");
      setValue("");
    }
  }, [open]);

  const handleSubmit = () => {
    const s = system.trim();
    const l = login.trim();

    if (!s || !l || !value) {
      setError("Заполните все поля: система, логин и значение секрета.");
      return;
    }

    // Отдаём строго backend-коды + value
    onCreate({
      system: s,
      login: l,
      type, // password / ssh_key / ...
      platform, // windows / linux / ...
      value,
    });

    // Закрываем модалку снаружи (как и было)
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onMouseDown={(e) => {
        // закрытие по клику на фон — best-effort, не ломает UX
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="bg-white rounded-xl p-6 w-[460px] shadow-xl">
        <h2 className="text-2xl font-bold mb-1 text-black">Добавить секрет</h2>
        <p className="text-sm text-gray-600 mb-4">
          Значение будет сохранено в Vault в зашифрованном виде.
        </p>

        <div className="flex flex-col gap-3">
          <input
            className="border p-2 rounded text-black"
            placeholder="Название системы (например: srv-ad-01)"
            value={system}
            onChange={(e) => {
              setSystem(e.target.value);
              if (error) setError(null);
            }}
          />

          <input
            className="border p-2 rounded text-black"
            placeholder="Логин (например: administrator)"
            value={login}
            onChange={(e) => {
              setLogin(e.target.value);
              if (error) setError(null);
            }}
          />

          <select
            className="border p-2 rounded text-black"
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

          <select
            className="border p-2 rounded text-black"
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

          {/* VALUE */}
          <div className="flex flex-col gap-1">
            <input
              className="border p-2 rounded text-black"
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
            <div className="text-xs text-gray-500">
              Предпросмотр: <span className="font-mono">{maskPreview(value)}</span>{" "}
              <span className="text-gray-400">({typeLabel})</span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}

          <button className="k-btn-primary text-white" onClick={handleSubmit}>
            Добавить
          </button>

          <button className="k-btn-secondary mt-2 text-black" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}