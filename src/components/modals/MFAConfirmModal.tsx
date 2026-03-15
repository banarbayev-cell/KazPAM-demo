import React, { useEffect, useMemo, useState } from "react";

interface MFAConfirmProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (code: string) => void;
  verifyMode?: "backend" | "local";
  mfaType?: string;
  defaultMethod?: "totp" | "email";
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
        obj?.token ||
        obj?.access_token ||
        obj?.jwt ||
        obj?.state?.token ||
        obj?.state?.access_token;
      if (possible && String(possible).trim()) return String(possible);
    } catch {
      // ignore
    }
  }

  return null;
}

async function verifyMfaBackend(
  code: string,
  method: "totp" | "email"
): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("JWT не найден. Войдите в систему и повторите попытку.");
  }

  const res = await fetch("/api/mfa/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      code,
      method,
    }),
  });

  if (!res.ok) {
    let msg = `Ошибка MFA verify (${res.status})`;
    try {
      const data = await res.json();
      msg = data?.detail || data?.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

async function sendEmailMfaCode(): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("JWT не найден. Войдите в систему и повторите попытку.");
  }

  const res = await fetch("/api/mfa/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let msg = `Ошибка отправки email MFA (${res.status})`;
    try {
      const data = await res.json();
      msg = data?.detail || data?.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
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
    if (open) {
      setCode("");
      setErr(null);
      setLoading(false);
      setMethod(defaultMethod);
      setEmailSent(false);
    }
  }, [open, defaultMethod]);

  const canSubmit = useMemo(() => code.trim().length >= 6 && !loading, [code, loading]);

  if (!open) return null;

  const handleSendEmailCode = async () => {
    setErr(null);
    setLoading(true);

    try {
      await sendEmailMfaCode();
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
    setErr("Введите корректный код (минимум 6 символов).");
    return;
  }

  setErr(null);
  setLoading(true);

  try {
    // Для TOTP можно оставить backend verify,
    // для email НЕ вызываем /mfa/verify, а передаём код дальше в reveal endpoint
    if (verifyMode === "backend" && method === "totp") {
      await verifyMfaBackend(trimmed, method);
    }

    onSuccess(trimmed);
    onClose();
  } catch (e: any) {
    setErr(e?.message || "❌ Неверный код");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl w-[420px] p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Подтверждение личности</h2>
        <p className="text-gray-600 mb-5">
          Выберите способ подтверждения и введите одноразовый код.
        </p>

        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Выберите метод подтверждения
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
                }}
                disabled={loading}
              />
              Email код
            </label>
          </div>
        </div>

        {method === "email" && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleSendEmailCode}
              className="px-4 py-2 bg-gray-200 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-60"
              disabled={loading}
            >
              {emailSent ? "Отправить код повторно" : "Отправить код на email"}
            </button>

            {emailSent && (
              <div className="text-sm text-green-600 mt-2">
                Код отправлен на вашу почту.
              </div>
            )}
          </div>
        )}

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={
            method === "email"
              ? "Введите код из email"
              : "Введите код из Google Authenticator"
          }
          className="w-full border border-gray-300 rounded-lg p-3 mb-3 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
          disabled={loading}
        />

        {err && <div className="text-sm text-red-600 mb-4">{err}</div>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
            disabled={loading}
          >
            Отмена
          </button>

          <button
            onClick={handleVerify}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60"
            disabled={!canSubmit}
          >
            {loading ? "Проверка..." : "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}