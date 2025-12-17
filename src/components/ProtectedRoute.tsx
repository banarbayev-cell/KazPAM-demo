import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const isInitialized = useAuth((s) => s.isInitialized);

  // ⏳ Ждём, пока loadFromStorage() отработает
  if (!isInitialized) {
    return null; // или loader
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
