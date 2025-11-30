import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Power, CheckCircle, Trash2, Settings } from "lucide-react";

interface ActionMenuProps {
  status: string;
  onDisable: () => void;
  onActivate: () => void;
  onDelete: () => void;
}

export default function ActionMenu({ status, onDisable, onActivate, onDelete }: ActionMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="text-[var(--neon)] hover:underline cursor-pointer font-medium flex items-center gap-1">
        <Settings size={14} />
        Изменить ▾
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-[0_0_20px_rgba(0,82,255,0.2)] py-2 text-sm animate-scaleIn z-50 backdrop-blur-xl"
        sideOffset={8}
      >
        {status === "active" ? (
          <DropdownMenu.Item
            onSelect={onDisable}
            className="flex items-center gap-2 px-4 py-2 hover:bg-[#0F1931] focus:bg-[#0F1931] outline-none cursor-pointer"
          >
            <Power size={16} className="text-red-400" />
            <span className="text-red-400">Отключить</span>
          </DropdownMenu.Item>
        ) : (
          <DropdownMenu.Item
            onSelect={onActivate}
            className="flex items-center gap-2 px-4 py-2 hover:bg-[#0F1931] focus:bg-[#0F1931] outline-none cursor-pointer"
          >
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-green-400">Активировать</span>
          </DropdownMenu.Item>
        )}

        <DropdownMenu.Separator className="h-px bg-[var(--border)] my-2" />

        <DropdownMenu.Item
          onSelect={onDelete}
          className="flex items-center gap-2 px-4 py-2 hover:bg-red-950 focus:bg-red-950 outline-none cursor-pointer"
        >
          <Trash2 size={16} className="text-red-600" />
          <span className="text-red-600">Удалить</span>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
