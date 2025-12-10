import { Navigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useEffect, useState } from "react";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const loadFromStorage = useAuth((s) => s.loadFromStorage);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // восстанавливаем сессию из localStorage
    loadFromStorage();
    setLoading(false);
  }, []);

  // пока идёт загрузка — отображаем пустой экран
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  // если нет токена — редирект на логин
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // пользователь авторизован
  return children;
}
