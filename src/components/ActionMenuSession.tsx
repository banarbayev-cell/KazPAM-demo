import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "./ui/dropdown-menu";

export default function ActionMenuSession({ onTerminate, onView, onAudit }: any) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5
               bg-[#1A243F] hover:bg-[#0E1A3A]
               text-gray-200 border border-[#1E2A45]
               rounded-md transition cursor-pointer select-none">
          Действия
          <span className="text-gray-400 text-sm">▼</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>Просмотр</DropdownMenuItem>

        <DropdownMenuItem className="text-red-400" onClick={onTerminate}>
          Завершить сессию
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onAudit}>Открыть аудит</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
