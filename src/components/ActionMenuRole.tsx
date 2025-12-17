import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface ActionMenuRoleProps {
  role?: {
    id: number;
    name: string;
  };
  onAssign: () => void;
  onPermissions: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ActionMenuRole({
  role,
  onAssign,
  onPermissions,
  onEdit,
  onDelete,
}: ActionMenuRoleProps) {
  const navigate = useNavigate();
  const isSuperadmin = role?.name === "superadmin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="
            flex items-center gap-2 px-3 py-1.5
            bg-[#1A243F] hover:bg-[#0E1A3A]
            text-gray-200 border border-[#1E2A45]
            rounded-md transition cursor-pointer select-none
          "
        >
          Управление
          <span className="text-gray-400 text-sm">▼</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="bg-[#121A33] text-gray-200 border border-[#1E2A45] w-64"
      >
        <DropdownMenuItem onClick={onAssign}>
          Привязать политики
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onPermissions}>
          Права роли
        </DropdownMenuItem>

        {/* ===== История изменений ===== */}
        <DropdownMenuItem
          onClick={() => {
            if (role?.id) {
              navigate(`/audit?category=role&role_id=${role.id}`);
            }
          }}
        >
          История изменений
        </DropdownMenuItem>

        {/* ===== Edit ===== */}
        <DropdownMenuItem
          onClick={!isSuperadmin ? onEdit : undefined}
          disabled={isSuperadmin}
          className={isSuperadmin ? "opacity-50 cursor-not-allowed" : ""}
        >
          Редактировать
        </DropdownMenuItem>

        {/* ===== Delete ===== */}
        <DropdownMenuItem
          onClick={!isSuperadmin ? onDelete : undefined}
          disabled={isSuperadmin}
          className={
            isSuperadmin
              ? "opacity-50 cursor-not-allowed"
              : "text-red-500"
          }
        >
          Удалить
        </DropdownMenuItem>

        {/* ===== INFO MESSAGE (ТОЛЬКО ДЛЯ superadmin) ===== */}
        {isSuperadmin && (
          <div className="px-3 py-2 mt-1 text-xs text-gray-400 border-t border-[#1E2A45]">
            Роль <span className="text-gray-300">superadmin</span> нельзя
            редактировать или удалять
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
