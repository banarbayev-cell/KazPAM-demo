import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "./ui/dropdown-menu";

export default function ActionMenuRole({
  onAssign,
  onPermissions,
  onEdit,
  onDelete,
}: any) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-1.5
                     bg-[#1A243F] hover:bg-[#0E1A3A]
                     text-gray-200 border border-[#1E2A45]
                     rounded-md transition cursor-pointer select-none"
        >
          Управление
          <span className="text-gray-400 text-sm">▼</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="bg-[#121A33] text-gray-200 border border-[#1E2A45]"
      >
        <DropdownMenuItem onClick={onAssign}>
          Привязать политики
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onPermissions}>
          Права роли
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onEdit}>
          Редактировать
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onDelete}
          className="text-red-500"
        >
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
