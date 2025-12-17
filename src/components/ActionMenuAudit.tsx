import { useState, useRef, useEffect } from "react";

interface ActionMenuAuditProps {
  onView: () => void;
  onExportJson?: () => void;
}

export default function ActionMenuAudit({
  onView,
  onExportJson,
}: ActionMenuAuditProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Закрытие при клике вне меню
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="
          px-3 py-1
          bg-[#1E2A45]
          rounded-md
          text-white
          text-sm
          hover:bg-[#24355C]
          transition
          flex items-center gap-1
        "
      >
        Действия
        <span className="text-xs">▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute right-0 mt-2 w-48
            bg-[#121A33]
            border border-white/10
            rounded-lg
            shadow-xl
            z-50
            overflow-hidden
          "
        >
          {/* View */}
          <button
            onClick={() => {
              onView();
              setOpen(false);
            }}
            className="
              block w-full text-left
              px-4 py-2
              text-sm text-white
              hover:bg-[#0E1A3A]
              transition
            "
          >
            Детали события
          </button>

          {/* Export JSON */}
          <button
            onClick={() => {
              onExportJson?.();
              setOpen(false);
            }}
            className="
              block w-full text-left
              px-4 py-2
              text-sm text-cyan-400
              hover:bg-[#0E1A3A]
              transition
            "
          >
            Экспорт JSON
          </button>
        </div>
      )}
    </div>
  );
}
