import React, { useEffect, useMemo, useState } from "react";
import { mfaApi } from "../../api/mfa";

interface MFAConfirmProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (code: string) => void;
  verifyMode?: "backend" | "local";
  mfaType?: string;
  defaultMethod?: "totp" | "email";
}

function sanitizeCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

export default function MFAConfirmModal({
  open,
  onClose,
  onSuccess,
  verifyMode = "backend",
  defaultMethod = "totp",
}: MFAConfirmProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [method, setMethod] = useState<"totp" | "email">(defaultMethod);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!open) return;

    setCode("");
    setErr(null);
    setLoading(false);
    setMethod(defaultMethod);
    setEmailSent(false);
  }, [open, defaultMethod]);

  const canSubmit = useMemo(() => {
    const trimmed = code.trim();
    return trimmed.length >= 6 && !loading;
  }, [code, loading]);

  if (!open) return null;

  const handleSendEmailCode = async () => {
    setErr(null);
    setLoading(true);

    try {
      await mfaApi.sendEmailCode();
      setEmailSent(true);
    } catch (e: any) {
      setErr(e?.message || "Не удалось отправить код на email");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const trimmed = code.trim();

    if (trimmed.length < 6) {
      setErr("Введите корректный код (минимум 6 цифр).");
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      /**
       * ВАЖНО:
       * Для TOTP оставляем backend verify.
       * Для email сохраняем текущую архитектуру:
       * код передаётся дальше в onSuccess, где его использует нужный endpoint.
       */
      if (verifyMode === "backend" && method === "totp") {
        await mfaApi.verify(trimmed, "totp");
      }

      onSuccess(trimmed);
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Неверный код подтверждения");
    } finally {
      setLoading(false);
    }
  };

  const helperText =
    method === "email"
      ? "Мы отправим одноразовый код на вашу почту."
      : "Введите код из приложения Google Authenticator.";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="w-[420px] rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Подтверждение личности
        </h2>

        <p className="mb-5 text-sm text-gray-600">
          Для продолжения подтвердите действие вторым фактором.
        </p>

        <div className="mb-4">
          <div className="mb-2 text-sm font-medium text-gray-700">
            Способ подтверждения
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="mfa_method"
                value="totp"
                checked={method === "totp"}
                onChange={() => {
                  setMethod("totp");
                  setErr(null);
                  setCode("");
                }}
                disabled={loading}
              />
              Google Authenticator
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="mfa_method"
                value="email"
                checked={method === "email"}
                onChange={() => {
                  setMethod("email");
                  setErr(null);
                  setCode("");
                }}
                disabled={loading}
              />
              Email код
            </label>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {helperText}
        </div>

        {method === "email" && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleSendEmailCode}
              className="rounded-lg bg-gray-200 px-4 py-2 font-medium hover:bg-gray-300 disabled:opacity-60"
              disabled={loading}
            >
              {emailSent ? "Отправить код повторно" : "Отправить код на email"}
            </button>

            {emailSent && (
              <div className="mt-2 text-sm text-green-600">
                Код отправлен на вашу почту.
              </div>
            )}
          </div>
        )}

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(sanitizeCode(e.target.value))}
          placeholder={
            method === "email"
              ? "Введите код из email"
              : "Введите код из приложения"
          }
          className="mb-2 w-full rounded-lg border border-gray-300 p-3 text-lg outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />

        <div className="mb-3 text-xs text-gray-500">
          Обычно код состоит из 6 цифр.
        </div>

        {err && <div className="mb-4 text-sm text-red-600">{err}</div>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-5 py-2 font-medium hover:bg-gray-300"
            disabled={loading}
          >
            Отмена
          </button>

          <button
            onClick={handleVerify}
            className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={!canSubmit}
          >
            {loading ? "Проверка..." : "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}