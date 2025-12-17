import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../store/auth"; // <-- без алиаса

export default function AuthGuard() {
  const user = useAuth((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
