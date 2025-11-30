import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
}

export default function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow-md hover:shadow-[0_0_18px_#3BE3FD55] transition-all duration-300 flex items-center gap-4">

      {/* ICON */}
      <div className="p-3 rounded-lg bg-[#0E1A3A] border border-[var(--border)] text-[#3BE3FD] shadow-[0_0_10px_#3BE3FD55]">
        {icon}
      </div>

      {/* TEXT */}
      <div>
        <p className="text-[var(--text-secondary)] text-sm">{title}</p>
        <h3 className="text-3xl font-bold text-[var(--neon)] mt-1">{value}</h3>
      </div>

    </div>
  );
}
