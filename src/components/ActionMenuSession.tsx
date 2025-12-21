import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";

interface Props {
  onView: () => void;
  onTerminate: () => void;
  onAudit: () => void;
}

export default function ActionMenuSession({
  onView,
  onTerminate,
  onAudit,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5
                     bg-[#1A243F] hover:bg-[#0E1A3A]
                     text-gray-200 border border-[#1E2A45]
                     rounded-md transition cursor-pointer select-none"
        >
          Действия
          <span className="text-gray-400 text-sm">▼</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onView}>
          Просмотр
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={onTerminate}
          className="text-red-400"
        >
          Завершить сессию
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onAudit}>
          Открыть аудит
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
