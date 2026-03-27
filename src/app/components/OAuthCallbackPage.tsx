import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

/**
 * 카카오/네이버 OAuth 인가 코드를 받아 FastAPI 콜백 엔드포인트로 전달하고
 * 내부 JWT를 sessionStorage에 저장한 뒤 서비스 선택 페이지로 이동합니다.
 *
 * 라우트: /oauth/callback/:provider  (provider = "kakao" | "naver")
 * 카카오 redirect_uri: http://localhost/oauth/callback/kakao
 * 네이버 redirect_uri: http://localhost/oauth/callback/naver
 */
export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: string }>();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state") ?? undefined;

    if (!code) {
      navigate("/", { replace: true });
      return;
    }

    const fetchToken = async () => {
      try {
        const query = new URLSearchParams({ code });
        if (state) query.set("state", state);

        const res = await fetch(`${API_BASE}/api/v1/auth/${provider}/callback?${query.toString()}`);
        if (!res.ok) throw new Error("인증 실패");

        const data = await res.json();
        sessionStorage.setItem("access_token", data.access_token);
        sessionStorage.setItem("auth_provider", data.provider);
        navigate("/services", { replace: true });
      } catch {
        navigate("/", { replace: true });
      }
    };

    fetchToken();
  }, [navigate, provider]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-blue-200">로그인 처리 중...</p>
      </div>
    </div>
  );
}
