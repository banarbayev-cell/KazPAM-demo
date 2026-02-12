import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const location = useLocation();
  const { token, isInitialized, mustChangePassword } = useAuth();

  // ⏳ Ждём восстановления auth из localStorage
  if (!isInitialized) {
    return null;
  }

  // 🚫 Не авторизован
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  /**
   * 🔐 PAM SECURITY MODE
   * Вошёл по временному паролю
   * — доступ только к смене пароля
   * — остальная система закрыта
   */
  if (mustChangePassword && location.pathname !== "/force-change-password") {
    return <Navigate to="/force-change-password" replace />;
  }

  return children;
}
