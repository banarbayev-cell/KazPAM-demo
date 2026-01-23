import { useEffect, useMemo, useState } from "react";
import { X, Eye, EyeOff, Copy, TimerReset } from "lucide-react";
import { toast } from "sonner";

interface SecureRevealModalProps {
  open: boolean;
  onClose: () => void;

  title: string;          // system name
  subtitle?: string;      // login/type etc (optional)

  secretValue: string;    // value from backend reveal
  autoHideSeconds?: number; // default 20s

  onCopied?: () => void;  // optional callback
}

function maskValue(value: string): string {
  if (!value) return "";
  // preserve length but mask most characters
  if (value.length <= 6) return "••••••";
  const head = value.slice(0, 2);
  const tail = value.slice(-2);
  return `${head}${"•".repeat(Math.min(24, value.length - 4))}${tail}`;
}

export default function SecureRevealModal({
  open,
  onClose,
  title,
  subtitle,
  secretValue,
  autoHideSeconds = 20,
  onCopied,
}: SecureRevealModalProps) {
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(autoHideSeconds);

  const masked = useMemo(() => maskValue(secretValue), [secretValue]);

  // Reset state when opened
  useEffect(() => {
    if (!open) return;
    setVisible(false);
    setSecondsLeft(autoHideSeconds);
  }, [open, autoHideSeconds]);

  // Autohide timer only when visible
  useEffect(() => {
    if (!open) return;
    if (!visible) return;

    if (secondsLeft <= 0) {
      setVisible(false);
      setSecondsLeft(autoHideSeconds);
      toast.message("Секрет скрыт автоматически");
      return;
    }

    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [open, visible, secondsLeft, autoHideSeconds]);

  // ESC close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="w-[720px] max-w-[95vw] bg-[#121A33] text-white rounded-2xl shadow-2xl border border-[#1E2A45] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2A45]">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle ? (
              <p className="text-sm text-gray-300 mt-0.5">{subtitle}</p>
            ) : null}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#0E1A3A] transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className="bg-[#0E1A3A] border border-[#1E2A45] rounded-xl p-4 text-sm text-gray-200">
            Секрет отображается безопасно: по умолчанию скрыт, автоскрытие включено,
            копирование доступно. Не вставляйте секрет в чаты/логи.
          </div>

          {/* Secret box */}
          <div className="bg-[#0B122A] border border-[#1E2A45] rounded-xl p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                {visible ? (
                  <>
                    <TimerReset size={16} />
                    Автоскрытие через <b className="text-white">{secondsLeft}</b> сек.
                  </>
                ) : (
                  <>
                    <EyeOff size={16} />
                    Секрет скрыт
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!visible) {
                      setVisible(true);
                      setSecondsLeft(autoHideSeconds);
                      return;
                    }
                    setVisible(false);
                    setSecondsLeft(autoHideSeconds);
                  }}
                  className="px-3 py-2 rounded-lg bg-[#0E1A3A] hover:bg-[#162455] border border-[#1E2A45] transition text-sm font-semibold flex items-center gap-2"
                >
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                  {visible ? "Скрыть" : "Показать"}
                </button>

                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(secretValue);
                      toast.success("Секрет скопирован в буфер обмена");
                      onCopied?.();

                      // усиление: после копирования можно сразу скрыть
                      setVisible(false);
                      setSecondsLeft(autoHideSeconds);
                    } catch {
                      toast.error("Не удалось скопировать секрет");
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-[#0052FF] hover:bg-blue-600 transition text-sm font-semibold flex items-center gap-2"
                >
                  <Copy size={16} />
                  Copy
                </button>
              </div>
            </div>

            <pre className="whitespace-pre-wrap break-words text-sm text-gray-100 leading-6">
              {visible ? secretValue : masked}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1E2A45] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#0E1A3A] hover:bg-[#162455] border border-[#1E2A45] transition text-sm font-semibold"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
