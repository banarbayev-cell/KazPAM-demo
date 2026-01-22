import React, { useEffect, useMemo, useState } from "react";

interface MFAConfirmProps {
  open: boolean;
  onClose: () => void;

  /**
   * Усиление: теперь onSuccess получает введённый код.
   * Это не ломает текущую архитектуру — просто добавляет возможность
   * использовать backend-проверку и/или follow-up действия (reveal/copy).
   */
  onSuccess: (code: string) => void;

  /**
   * Усиление: режим проверки MFA.
   * - "backend" (по умолчанию): вызывает POST /mfa/verify
   * - "local": оставлен для fallback/демо (как раньше)
   */
  verifyMode?: "backend" | "local";

  /**
   * Если твой backend требует поле типа (TOTP/Email/SMS),
   * можно будет прокинуть. Сейчас оставляем опционально.
   */
  mfaType?: string;
}

/**
 * Пытаемся достать JWT максимально безопасно.
 * Не ломаем существующий store: просто пытаемся найти типовые ключи.
 */
function getAuthToken(): string | null {
  const keys = ["token", "access_token", "jwt", "auth_token"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v.trim()) return v;
  }

  // Иногда токен лежит JSON-объектом (например, auth store)
  const jsonKeys = ["auth", "authStore", "kazpam_auth", "session"];
  for (const k of jsonKeys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      const possible =
        obj?.token || obj?.access_token || obj?.jwt || obj?.state?.token || obj?.state?.access_token;
      if (possible && String(possible).trim()) return String(possible);
    } catch {
      // ignore
    }
  }

  return null;
}

async function verifyMfaBackend(code: string, mfaType?: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    // В PAM-системе MFA verify без auth не имеет смысла
    throw new Error("JWT не найден. Войдите в систему и повторите попытку.");
  }

  // OpenAPI: POST /mfa/verify
  // Схема MFACode в твоём списке. Обычно это { code: "123456" }.
  // Добавляем mfa_type опционально (если backend не принимает — проигнорит либо вернёт 422).
  const payload: any = { code };
  if (mfaType) payload.mfa_type = mfaType;

  const res = await fetch("/api/mfa/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
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

export default function MFAConfirmModal({
  open,
  onClose,
  onSuccess,
  verifyMode = "backend",
  mfaType,
}: MFAConfirmProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setErr(null);
      setLoading(false);
    }
  }, [open]);

  const canSubmit = useMemo(() => code.trim().length >= 6 && !loading, [code, loading]);

  if (!open) return null;

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (trimmed.length < 6) {
      setErr("Введите корректный код (минимум 6 символов).");
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      if (verifyMode === "backend") {
        await verifyMfaBackend(trimmed, mfaType);
      } else {
        // Fallback demo режим: оставляем прежнюю заглушку, но не как основной путь.
        if (trimmed !== "123456") {
          throw new Error("Неверный код");
        }
      }

      // Важно: onSuccess вызываем ДО onClose, чтобы родитель мог выполнить reveal/copy.
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
        <p className="text-gray-600 mb-5">Введите одноразовый код подтверждения для просмотра секрета.</p>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Введите код"
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
