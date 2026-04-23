// src/components/modals/ProfileModal.tsx
import { createPortal } from "react-dom";
import { useAuth } from "../../store/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { mfaApi, MfaStatus } from "../../api/mfa";

/**
 * =====================================================
 * HELPERS
 * =====================================================
 */
function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * =====================================================
 * COMPONENT
 * =====================================================
 * ⚠️ BACKWARD COMPATIBLE:
 * - если user передан через props → используем его
 * - если нет → берём user из useAuth
 */
export default function ProfileModal({
  open,
  onClose,
  user: userFromProps,
}: any) {
  const logout = useAuth((s) => s.logout);
  const authUser = useAuth((s) => s.user);
  const fetchMe = useAuth((s) => s.fetchMe);

  const user = userFromProps ?? authUser;

  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaStatusLoading, setMfaStatusLoading] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);

  const [setupMethod, setSetupMethod] = useState<"totp" | "email">("totp");

  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpUri, setMfaOtpUri] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);

  const loadMfaStatus = async () => {
    try {
      setMfaStatusLoading(true);
      const status = await mfaApi.getStatus();
      setMfaStatus(status);

      if (!status.mfa_enabled && status.pending_setup) {
        if (status.mfa_method === "email" || status.mfa_method === "totp") {
          setSetupMethod(status.mfa_method);
        }
      } else {
        setSetupMethod("totp");
      }
    } catch {
      setMfaStatus(null);
    } finally {
      setMfaStatusLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !user) return;

    setMfaSecret(null);
    setMfaOtpUri(null);
    setMfaCode("");
    setEmailCodeSent(false);

    loadMfaStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  if (!open) return null;
  if (!user) return null;

  /**
   * =====================================================
   * DISPLAY DATA (SAFE)
   * =====================================================
   */
  const displayName = user.email || user.username || "user";
  const avatar = displayName?.[0]?.toUpperCase() || "U";
  const primaryRole = user?.roles?.[0]?.name || "—";

  const isMfaEnabled = mfaStatus?.mfa_enabled ?? user.mfa_enabled ?? false;
  const pendingSetup = mfaStatus?.pending_setup ?? false;
  const mfaMethod = mfaStatus?.mfa_method ?? user.mfa_method ?? null;
  const emailMfaAvailable = mfaStatus?.email_available ?? false;

  const mfaStatusText = isMfaEnabled
    ? `Включено${mfaMethod ? ` (${mfaMethod})` : ""}`
    : pendingSetup
    ? `Настройка не завершена${mfaMethod ? ` (${mfaMethod})` : ""}`
    : "Выключено";

  const resetSetupLocalState = () => {
    setMfaSecret(null);
    setMfaOtpUri(null);
    setMfaCode("");
    setEmailCodeSent(false);
  };

  const startTotpSetup = async () => {
    try {
      setMfaLoading(true);
      resetSetupLocalState();

      const res = await mfaApi.enableTotp();

      setSetupMethod("totp");
      setMfaSecret(res.secret);
      setMfaOtpUri(res.otpauth_uri);
      setMfaStatus((prev) => ({
        mfa_enabled: false,
        mfa_method: "totp",
        pending_setup: true,
        email_available: prev?.email_available ?? false,
      }));

      toast.success(
        "Секрет MFA сгенерирован. Добавьте его в Google Authenticator."
      );
    } catch (e: any) {
      toast.error(e?.message || "Не удалось начать настройку MFA");
    } finally {
      setMfaLoading(false);
    }
  };

  const sendEmailSetupCode = async () => {
    if (!emailMfaAvailable) {
      toast.error("Email MFA недоступна: SMTP не настроен на сервере");
      return;
    }
   
    try {
      setMfaLoading(true);
      setMfaSecret(null);
      setMfaOtpUri(null);

      await mfaApi.sendEmailCode();

      setSetupMethod("email");
      setEmailCodeSent(true);
      setMfaStatus((prev) => ({
        mfa_enabled: false,
        mfa_method: "email",
        pending_setup: true,
        email_available: prev?.email_available ?? false,
      }));

      toast.success("Код подтверждения отправлен на вашу почту");
    } catch (e: any) {
      toast.error(e?.message || "Не удалось отправить email код");
    } finally {
      setMfaLoading(false);
    }
  };

  const verifyCurrentMethod = async () => {
    if (!mfaCode.trim()) {
      toast.error("Введите MFA код");
      return;
    }

    try {
      setMfaLoading(true);

      await mfaApi.verify(mfaCode.trim(), setupMethod);

      setMfaCode("");
      setMfaSecret(null);
      setMfaOtpUri(null);
      setEmailCodeSent(false);

      await loadMfaStatus();
      await fetchMe();

      toast.success(
        setupMethod === "email"
          ? "Email MFA успешно включена"
          : "MFA успешно включена"
      );
    } catch (e: any) {
      toast.error(e?.message || "Неверный MFA код");
    } finally {
      setMfaLoading(false);
    }
  };

  const renderMfaSetup = () => {
    if (isMfaEnabled) return null;

    return (
      <div className="mt-3 rounded-lg bg-[#0E1A3A] border border-[#1E2A45] p-3">
        <p className="text-sm text-gray-300 mb-3">
          {pendingSetup
            ? "Настройка MFA начата, но ещё не завершена. Выберите метод и завершите подтверждение."
            : "Выберите способ настройки второго фактора."}
        </p>

        {/* Method selector */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setSetupMethod("totp");
              setMfaCode("");
              setEmailCodeSent(false);
            }}
            disabled={mfaLoading}
            className={`px-3 py-2 rounded-lg border text-sm transition ${
              setupMethod === "totp"
                ? "bg-[#0052FF] text-white border-[#0052FF]"
                : "bg-[#121A33] text-gray-300 border-[#1E2A45] hover:bg-[#182447]"
            }`}
          >
            Google Authenticator
          </button>

          <button
            type="button"
            onClick={() => {
              if (!emailMfaAvailable) return;
              setSetupMethod("email");
              setMfaSecret(null);
              setMfaOtpUri(null);
              setMfaCode("");
            }}
            disabled={mfaLoading || !emailMfaAvailable}
            className={`px-3 py-2 rounded-lg border text-sm transition ${
              setupMethod === "email"
                ? "bg-[#0052FF] text-white border-[#0052FF]"
                : "bg-[#121A33] text-gray-300 border-[#1E2A45] hover:bg-[#182447]"
            } ${!emailMfaAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Email код
          </button>
        </div>
 

        {/* TOTP FLOW */}
        {setupMethod === "totp" && (
          <div className="space-y-3">
            {!mfaSecret ? (
              <button
                onClick={startTotpSetup}
                disabled={mfaLoading}
                className="px-4 py-2 rounded-lg bg-[#0052FF] text-white hover:bg-[#0040cc] transition disabled:opacity-50"
              >
                {mfaLoading
                  ? "Подготовка..."
                  : pendingSetup && mfaMethod === "totp"
                  ? "Сгенерировать новый секрет"
                  : "Настроить MFA через Google Authenticator"}
              </button>
            ) : (
              <>
                <div className="text-xs text-gray-400">
                  Секрет для ручного ввода в Google Authenticator:
                </div>

                <div className="break-all rounded-md bg-[#121A33] border border-[#1E2A45] p-3 text-sm text-white">
                  {mfaSecret}
                </div>

                {mfaOtpUri && (
                  <div className="text-xs text-gray-500 break-all">
                    otpauth URI: {mfaOtpUri}
                  </div>
                )}

                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="Введите 6-значный код из приложения"
                  className="w-full bg-[#121A33] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
                />

                <div className="flex gap-2">
                  <button
                    onClick={verifyCurrentMethod}
                    disabled={mfaLoading}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {mfaLoading ? "Проверка..." : "Подтвердить"}
                  </button>

                  <button
                    onClick={resetSetupLocalState}
                    disabled={mfaLoading}
                    className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-50"
                  >
                    Отмена
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* EMAIL FLOW */}
        {setupMethod === "email" && (
          emailMfaAvailable ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                Подтверждение будет отправлено на email пользователя.
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={sendEmailSetupCode}
                  disabled={mfaLoading}
                  className="px-4 py-2 rounded-lg bg-[#0052FF] text-white hover:bg-[#0040cc] transition disabled:opacity-50"
                >
                  {mfaLoading
                    ? "Отправка..."
                    : emailCodeSent || (pendingSetup && mfaMethod === "email")
                    ? "Отправить код повторно"
                    : "Отправить код на email"}
                </button>
              </div>

              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="Введите код из email"
                className="w-full bg-[#121A33] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
              />

              <div className="flex gap-2">
                <button
                  onClick={verifyCurrentMethod}
                  disabled={mfaLoading}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                >
                  {mfaLoading ? "Проверка..." : "Подтвердить"}
                </button>

                <button
                  onClick={() => {
                    setMfaCode("");
                    setEmailCodeSent(false);
                  }}
                  disabled={mfaLoading}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-50"
                >
                  Очистить
                </button>
              </div>
            </div>
         ) : (
           <div className="rounded-lg border border-[#5B4A1A] bg-[#2A2412] p-3 text-sm text-yellow-300">
             Email MFA сейчас недоступна. Администратор должен настроить SMTP на сервере KazPAM.
          </div>
        )
      )}
    </div>
  );
};

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--bg-card)] w-[420px] rounded-xl border border-[var(--border)] shadow-2xl p-6 animate-fadeIn">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Профиль пользователя
        </h2>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold text-white">
            {avatar}
          </div>

          <div>
            <p className="text-lg text-[var(--text-primary)] font-semibold">
              {displayName}
            </p>
            <p className="text-[var(--text-secondary)] text-sm">
              Привилегированный доступ
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-3 text-[var(--text-secondary)] mb-6">
          <p>
            <span className="font-semibold text-[var(--text-primary)]">
              Роль:
            </span>{" "}
            {primaryRole}
          </p>

          <p>
            <span className="font-semibold text-[var(--text-primary)]">
              Статус:
            </span>{" "}
            {user.is_active ? "Активен" : "Отключён"}
          </p>

          <p>
            <span className="font-semibold text-[var(--text-primary)]">
              Последний вход:
            </span>{" "}
            {formatDate(user.last_login)}
          </p>

          <div>
            <span className="font-semibold text-[var(--text-primary)]">
              MFA:
            </span>{" "}
            {mfaStatusLoading ? "Проверка статуса..." : mfaStatusText}

            {renderMfaSetup()}
          </div>

          {/* read-only permissions */}
          {Array.isArray(user.permissions) && (
            <div>
              <span className="font-semibold text-[var(--text-primary)]">
                Permissions:
              </span>
              <div className="mt-1 max-h-24 overflow-y-auto rounded-md bg-[#0E1A3A] p-2 text-xs text-gray-300">
                {user.permissions.length > 0 ? (
                  <ul className="space-y-1">
                    {user.permissions.map((p: string) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#0052FF] rounded-lg text-white font-semibold hover:bg-[#0040cc] transition"
          >
            Закрыть
          </button>

          <button
            onClick={logout}
            className="w-full py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}