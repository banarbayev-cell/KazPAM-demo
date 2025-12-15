import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const token = localStorage.getItem("access_token");

  // ❌ Нет токена — на логин
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Токен есть — пускаем
  return children;
}
