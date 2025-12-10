interface StatusChipProps {
  status: string;
}

export default function StatusChip({ status }: StatusChipProps) {
  const normalize = status.toLowerCase();

  const styles: Record<string, string> = {
    "успешно": "bg-green-900/40 text-green-400",
    "denied": "bg-red-900/40 text-red-400",
    "отклонено": "bg-red-900/40 text-red-400",
    "подозрительно": "bg-yellow-900/40 text-yellow-400",
    "suspicious": "bg-yellow-900/40 text-yellow-400",
    "ai": "bg-purple-900/40 text-purple-300",
    "ai-alert": "bg-purple-900/40 text-purple-300",
  };

  const style = styles[normalize] ?? "bg-gray-700/40 text-gray-300";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}
