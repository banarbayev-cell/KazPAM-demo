import { ReactNode } from "react";
import { useAuth } from "../store/auth";

interface AccessProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  hide?: boolean;
}

export default function Access({
  permission,
  children,
  fallback,
  hide = false,
}: AccessProps) {
  const user = useAuth((s) => s.user);

  if (!user) return null;

  const userPermissions: string[] = Array.isArray(user.permissions)
    ? user.permissions
    : [];

  const allowed = userPermissions.includes(permission);

  if (!allowed) {
    if (hide) return null;

    return (
      fallback ?? (
        <div className="rounded-2xl border border-[#1E2A45] bg-[#121A33] p-6 text-center">
          <div className="text-lg font-semibold text-gray-100">
            Доступ запрещён
          </div>
          <div className="mt-1 text-sm text-gray-400">
            Недостаточно прав для просмотра этого раздела
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}