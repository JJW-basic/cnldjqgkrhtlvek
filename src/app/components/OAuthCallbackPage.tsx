import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CheckCircle, Loader2 } from "lucide-react";
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

  const [isSuccess, setIsSuccess] = useState(false);

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

    // 성공 애니메이션 표출 후 이동
    setIsSuccess(true);
    setTimeout(() => {
      navigate("/consent", { replace: true });
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {!isSuccess ? (
        <div className="text-center text-white animate-fade-in flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-blue-200">인증 처리 중...</p>
        </div>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center transform transition-all duration-300 scale-100 opacity-100 translate-y-0">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 shadow-sm">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">인증 성공!</h3>
            <p className="text-slate-500 text-sm">잠시 후 다음 단계로 이동합니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
