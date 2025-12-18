import { ReactNode } from "react";
import { useAuth } from "../store/auth";

interface AccessProps {
  permission: string;
  children: ReactNode;
}

export default function Access({ permission, children }: AccessProps) {
  const user = useAuth((s) => s.user);

  if (!user) return null;

  const userPermissions: string[] = Array.isArray(user.permissions)
    ? user.permissions
    : [];

  if (userPermissions.includes(permission)) {
    return <>{children}</>;
  }

  return null;
}
