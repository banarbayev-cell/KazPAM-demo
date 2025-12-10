import { ReactNode } from "react";
import { useAuth } from "../store/auth";

interface AccessProps {
  permission: string;      // нужное право
  children: ReactNode;
}

export default function Access({ permission, children }: AccessProps) {
  const user = useAuth((s) => s.user);

  if (!user) return null;

  // Защита: permissions ВСЕГДА массив
  const rawPermissions = user.permissions;
  const userPermissions: string[] = Array.isArray(rawPermissions)
    ? rawPermissions
    : [];

  const userRole = user.role || "";

  // superadmin всегда имеет доступ
  if (userRole === "superadmin") return <>{children}</>;

  // 1) Точное совпадение разрешения
  if (userPermissions.includes(permission)) {
    return <>{children}</>;
  }

  // 2) Групповые разрешения
  const hasGroupPermission = userPermissions.some((p) =>
    p.endsWith(permission)
  );

  if (hasGroupPermission) {
    return <>{children}</>;
  }

  return null;
}
