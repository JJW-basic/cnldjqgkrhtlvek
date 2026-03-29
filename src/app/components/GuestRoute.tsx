import { Navigate, Outlet } from "react-router";
import { useAuthContext } from "../lib/AuthContext";

/**
 * GuestRoute — 비인증 사용자 전용 라우트 가드.
 *
 * AuthContext 초기화가 동기적으로 수행되므로 "loading" 상태가 발생하지 않음.
 * - authenticated  → /services 강제 리다이렉트 (로그인 페이지 노출 차단)
 * - unauthenticated → 로그인 페이지 렌더링
 */
export function GuestRoute() {
  const { authState } = useAuthContext();

  if (authState === "authenticated") return <Navigate to="/services" replace />;
  return <Outlet />;
}
