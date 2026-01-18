// src/components/ui/StatusChip.tsx
import React from "react";

type Props = {
  status: "Granted" | "Denied";
};

export default function StatusChip({ status }: Props) {
  const granted = status === "Granted";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border",
        granted
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          : "border-rose-400/30 bg-rose-400/10 text-rose-200",
      ].join(" ")}
    >
      {status}
    </span>
  );
}
