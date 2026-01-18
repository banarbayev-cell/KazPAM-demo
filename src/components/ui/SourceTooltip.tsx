// src/components/ui/SourceTooltip.tsx
import React, { useState } from "react";
import { EffectivePermission } from "../../utils/effectivePermissions";

type Props = {
  permission: EffectivePermission;
  deniedReason?: string;
};

export default function SourceTooltip({ permission, deniedReason }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const onEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: rect.left,
    });
    setOpen(true);
  };

  const onLeave = () => {
    setOpen(false);
  };

  const hasRoles = permission.roles.length > 0;
  const hasPolicies = permission.policies.length > 0;

  return (
    <>
      {/* trigger */}
      <span
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="inline-flex items-center gap-1 text-gray-300 cursor-help"
      >
        {hasRoles ? permission.roles.join(", ") : "—"}
        <span className="text-gray-400">ℹ️</span>
      </span>

      {/* tooltip (FIXED, not clipped) */}
      {open && (
        <div
          style={{ top: pos.top, left: pos.left }}
          className="
            fixed z-[10000] w-80
            rounded-xl border border-[#1E2A45]
            bg-[#0E1A3A] p-4 text-xs text-gray-200 shadow-2xl
          "
        >
          {permission.granted ? (
            <>
              <div className="font-semibold text-white mb-2">
                Источник права
              </div>

              <div className="mb-2">
                <div className="text-gray-400">Роли:</div>
                {hasRoles ? (
                  <ul className="list-disc list-inside">
                    {permission.roles.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400">—</div>
                )}
              </div>

              <div>
                <div className="text-gray-400">Политики:</div>
                {hasPolicies ? (
                  <ul className="list-disc list-inside">
                    {permission.policies.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400">
                    напрямую через роль
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-white mb-2">
                Право не предоставлено
              </div>
              <div className="text-gray-300">
                {deniedReason ||
                  "Отсутствует во всех ролях пользователя."}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
