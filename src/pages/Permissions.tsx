import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { fetchPermissions } from "../api/permissions";
import { useAuth } from "../store/auth";

interface Permission {
  id: number;
  code: string;
}

export default function Permissions() {
  const user = useAuth((s) => s.user);

  // RBAC на уровне страницы (локально, ничего больше не ломаем)
  const rawPermissions = user?.permissions;
  const userPermissions: string[] = Array.isArray(rawPermissions) ? rawPermissions : [];

  if (!user) return <Navigate to="/login" replace />;
  if (!userPermissions.includes("manage_permissions")) {
    return <Navigate to="/dashboard" replace />;
  }

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPermissions();
        setPermissions(Array.isArray(data) ? data : []);
      } catch {
        setError("Не удалось загрузить права доступа");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Загрузка…</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-6">
        Управление доступом
      </h1>

      <div className="bg-[#121A33] border border-[#1E2A45] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0E1A3A] text-gray-300">
            <tr>
              <th className="text-left px-4 py-3">Код права</th>
            </tr>
          </thead>
          <tbody>
            {permissions.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-400">
                  Права не найдены
                </td>
              </tr>
            ) : (
              permissions.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[#1E2A45] hover:bg-[#0E1A3A]"
                >
                  <td className="px-4 py-3 text-white font-mono">{p.code}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
