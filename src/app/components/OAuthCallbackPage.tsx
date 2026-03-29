import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { getTokenSync } from "../lib/tokenStore";

/**
 * OAuthCallbackPage
 *
 * 카카오/네이버 OAuth 인가 코드를 받아 sessionStorage에 임시 저장 후
 * 동의 페이지(/consent)로 이동합니다.
 *
 * JWT 발급은 사용자가 동의 페이지에서 '동의'를 선택한 이후에만 수행됩니다.
 * (기준 1: 인증 토큰 발행은 API 인증 통과 후 사용자 동의 시에만 발행)
 */
export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: string }>();

  useEffect(() => {
    // 이미 인증된 경우 즉시 서비스 페이지로
    if (getTokenSync()) {
      navigate("/services", { replace: true });
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state") ?? undefined;

    if (!code || !provider) {
      navigate("/", { replace: true });
      return;
    }

    // React StrictMode 이중 실행 방지 (sessionStorage 기반 1회성 플래그)
    const flagKey = `oauth_processing_${code}`;
    if (sessionStorage.getItem(flagKey)) return;
    sessionStorage.setItem(flagKey, "1");

    // 인가 코드 임시 저장 → 동의 페이지에서 JWT 발급 요청에 사용
    sessionStorage.setItem("oauth_pending_code", code);
    sessionStorage.setItem("oauth_pending_provider", provider);
    if (state) sessionStorage.setItem("oauth_pending_state", state);
    sessionStorage.removeItem(flagKey);

    navigate("/consent", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-blue-200">인증 처리 중...</p>
      </div>
    </div>
  );
}
