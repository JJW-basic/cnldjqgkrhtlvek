import { Navigate, Outlet } from "react-router";
import { useAuthContext } from "../lib/AuthContext";
import { useIdleLogout } from "../lib/useIdleLogout";
import { getExpiresInMs } from "../lib/tokenStore";

/**
 * ProtectedLayout — 인증된 사용자 전용 라우트 가드.
 *
 * - authenticated  → 서비스 페이지 렌더링 + 유휴 로그아웃 타이머 활성화
 * - unauthenticated → / 강제 리다이렉트 (서비스 접근 차단)
 */
export function ProtectedLayout() {
  const { authState, logout } = useAuthContext();

  useIdleLogout(getExpiresInMs(), logout);

  if (authState === "unauthenticated") return <Navigate to="/" replace />;
  return <Outlet />;
}
