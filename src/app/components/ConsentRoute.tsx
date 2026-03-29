import { Navigate, Outlet } from "react-router";
import { useAuthContext } from "../lib/AuthContext";

/**
 * ConsentRoute — /consent 접근 조건 가드 (기준 3, 4, 5)
 *
 * 허용 조건 (모두 충족해야 함):
 *   1) 인증 토큰 없음 (기준 4-1)
 *   2) oauth_pending_code 존재 — 로그인 버튼 클릭 후 OAuth 인증 통과한 경우 (기준 4-2, 4-3)
 *
 * 차단 조건:
 *   - 토큰 있음 (기준 5) → /services 리다이렉트
 *   - oauth_pending_code 없음 (직접 URL 접근, 재방문) → / 리다이렉트
 */
export function ConsentRoute() {
  const { authState } = useAuthContext();

  // 기준 5: 토큰 있는 사용자는 ConsentPage 접근 불가
  if (authState === "authenticated") return <Navigate to="/services" replace />;

  // 기준 4-2/3: OAuth 흐름을 거치지 않은 직접 접근 차단
  const hasPendingCode = Boolean(sessionStorage.getItem("oauth_pending_code"));
  if (!hasPendingCode) return <Navigate to="/" replace />;

  return <Outlet />;
}
