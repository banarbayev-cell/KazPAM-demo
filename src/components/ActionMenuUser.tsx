import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "./ui/dropdown-menu";

interface ActionMenuUserProps {
  status: "active" | "disabled";
  onAssignRoles: () => void;
  onDisable?: () => void;
  onActivate?: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
}

export default function ActionMenuUser({
  status,
  onAssignRoles,
  onDisable,
  onActivate,
  onResetPassword,
  onDelete,
}: ActionMenuUserProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
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
        <DropdownMenuItem onClick={onAssignRoles}>
          Назначить роли
        </DropdownMenuItem>

        {status === "active" && onDisable && (
          <DropdownMenuItem
            className="text-yellow-400"
            onClick={onDisable}
          >
            Отключить пользователя
          </DropdownMenuItem>
        )}

        {status === "disabled" && onActivate && (
          <DropdownMenuItem
            className="text-green-400"
            onClick={onActivate}
          >
            Активировать пользователя
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={onResetPassword}>
          Сбросить пароль
        </DropdownMenuItem>

        <DropdownMenuItem
          className="text-red-500"
          onClick={onDelete}
        >
          Удалить пользователя
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
