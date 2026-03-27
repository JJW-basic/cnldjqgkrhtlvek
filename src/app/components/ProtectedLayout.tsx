import { Navigate, Outlet, useNavigate } from "react-router";
import { useAuth } from "../lib/useAuth";
import { useIdleLogout } from "../lib/useIdleLogout";
import { getExpiresInMs } from "../lib/tokenStore";

const Spinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

export function ProtectedLayout() {
  const navigate = useNavigate();
  const authState = useAuth();

  useIdleLogout(() => navigate("/", { replace: true }), getExpiresInMs());

  if (authState === "loading") return <Spinner />;
  if (authState === "unauthenticated") return <Navigate to="/" replace />;
  return <Outlet />;
}
