// src/components/modals/ProfileModal.tsx
import { createPortal } from "react-dom";
import { useAuth } from "../../store/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { mfaApi } from "../../api/mfa";

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

  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpUri, setMfaOtpUri] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  if (!open) return null;

  /**
   * 🔐 ЕДИНЫЙ ИСТОЧНИК USER
   * props → store → null
   */
  const user = userFromProps ?? authUser;

  if (!user) return null;

  /**
   * =====================================================
   * DISPLAY DATA (SAFE)
   * =====================================================
   */
  const displayName =
    user.email || user.username || "user";

  const avatar =
    displayName?.[0]?.toUpperCase() || "U";

  const primaryRole =
    user?.roles?.[0]?.name || "—";

  
    const startTotpSetup = async () => {
    try {
      setMfaLoading(true);
      const res = await mfaApi.enableTotp();
      setMfaSecret(res.secret);
      setMfaOtpUri(res.otpauth_uri);
      toast.success("Секрет MFA сгенерирован. Добавьте его в Google Authenticator.");
    } catch (e: any) {
      toast.error(e?.message || "Не удалось начать настройку MFA");
    } finally {
      setMfaLoading(false);
    }
  };

  const verifyTotp = async () => {
    if (!mfaCode.trim()) {
      toast.error("Введите MFA код");
      return;
    }

    try {
      setMfaLoading(true);
      await mfaApi.verify(mfaCode.trim(), "totp");
      setMfaCode("");
      setMfaSecret(null);
      setMfaOtpUri(null);
      await fetchMe();
      toast.success("MFA успешно включена");
    } catch (e: any) {
      toast.error(e?.message || "Неверный MFA код");
    } finally {
      setMfaLoading(false);
    }
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
            {user.mfa_enabled ? `Включено${user.mfa_method ? ` (${user.mfa_method})` : ""}` : "Выключено"}

            {!user.mfa_enabled && (
              <div className="mt-3 rounded-lg bg-[#0E1A3A] border border-[#1E2A45] p-3">
                <p className="text-sm text-gray-300 mb-3">
                  Настройте TOTP для Google Authenticator.
                </p>

                {!mfaSecret ? (
                  <button
                    onClick={startTotpSetup}
                    disabled={mfaLoading}
                    className="px-4 py-2 rounded-lg bg-[#0052FF] text-white hover:bg-[#0040cc] transition disabled:opacity-50"
                  >
                    {mfaLoading ? "Подготовка..." : "Настроить MFA"}
                  </button>
                ) : (
                  <div className="space-y-3">
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
                      placeholder="Введите 6-значный код"
                      className="w-full bg-[#121A33] border border-[#1E2A45] rounded-lg px-3 py-2 text-white"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={verifyTotp}
                        disabled={mfaLoading}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                      >
                        Подтвердить
                      </button>

                      <button
                        onClick={() => {
                          setMfaSecret(null);
                          setMfaOtpUri(null);
                          setMfaCode("");
                        }}
                        disabled={mfaLoading}
                        className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-50"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 🔒 Усиление: permissions (read-only, безопасно) */}
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
