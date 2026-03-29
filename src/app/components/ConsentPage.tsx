import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Shield, Lock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useAuthContext } from "../lib/AuthContext";

/**
 * ConsentPage — 접근 조건 (기준 4):
 *   1) 인증 토큰 없음
 *   2) 로그인 버튼 클릭 후 OAuth 인증 통과 (oauth_pending_code 존재)
 *   3) 외부 API 인증 통과
 *
 * 토큰 있는 사용자(기준 5): /services 즉시 리다이렉트
 * oauth_pending_code 없는 직접 접근: / 리다이렉트
 * 본인인증 미완료(403): 사유 표시 후 로그인 페이지 안내
 */
export function ConsentPage() {
  const navigate = useNavigate();
  const { authState, login } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [declined, setDeclined] = useState(false);
  // 본인인증 미완료 등 서버 거절 사유
  const [blockReason, setBlockReason] = useState<string | null>(null);

  // ConsentRoute가 접근 조건(토큰 없음 + pending_code 있음)을 이미 검증함
  // authState가 "authenticated"로 전환되면(setToken 호출 후) /services로 이동
  useEffect(() => {
    if (authState === "authenticated") {
      navigate("/services", { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState]);

  const handleConsent = async () => {
    const code = sessionStorage.getItem("oauth_pending_code");
    const provider = sessionStorage.getItem("oauth_pending_provider");
    const state = sessionStorage.getItem("oauth_pending_state");

    if (!code || !provider) {
      navigate("/", { replace: true });
      return;
    }

    setIsLoading(true);
    try {
      const query = new URLSearchParams({ code });
      if (state) query.set("state", state);

      const res = await fetch(`/api/v1/auth/${provider}/callback?${query.toString()}`, {
        credentials: "include",
      });

      // 기준 1-2: 본인인증 미완료 등 서버 거절 → 사유 표시
      if (res.status === 403) {
        const err = (await res.json()) as { detail?: string };
        sessionStorage.removeItem("oauth_pending_code");
        sessionStorage.removeItem("oauth_pending_provider");
        sessionStorage.removeItem("oauth_pending_state");
        setBlockReason(err.detail ?? "서비스 이용 조건을 충족하지 않습니다.");
        return;
      }

      if (!res.ok) throw new Error("인증 실패");

      const data = (await res.json()) as {
        access_token: string;
        provider: string;
        expires_in?: number;
      };

      sessionStorage.removeItem("oauth_pending_code");
      sessionStorage.removeItem("oauth_pending_provider");
      sessionStorage.removeItem("oauth_pending_state");

      // login() = setToken() + setAuthState("authenticated") 원자적 처리
      // → useEffect([authState])가 "authenticated" 감지 → navigate("/services")
      login(data.access_token, data.provider, data.expires_in);
    } catch {
      sessionStorage.removeItem("oauth_pending_code");
      sessionStorage.removeItem("oauth_pending_provider");
      sessionStorage.removeItem("oauth_pending_state");
      navigate("/", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    sessionStorage.removeItem("oauth_pending_code");
    sessionStorage.removeItem("oauth_pending_provider");
    sessionStorage.removeItem("oauth_pending_state");
    setDeclined(true);
  };

  // 본인인증 미완료 차단 화면
  if (blockReason) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-white text-xl font-bold mb-3">서비스 이용 불가</h2>
            <p className="text-blue-200/80 text-sm mb-6 leading-relaxed">{blockReason}</p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 동의 거절 화면
  if (declined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-white text-xl font-bold mb-3">서비스 이용 불가</h2>
            <p className="text-blue-200/80 mb-6">
              동의를 하신 분만 해당 서비스를 이용할 수 있습니다.
            </p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-lg">
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 sm:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 mb-4 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-3xl">🏥</span>
            </div>
            <h1 className="text-white text-center text-2xl font-bold">만성질환 예측 AI 서비스</h1>
            <p className="text-blue-200/70 mt-2 text-center text-sm">서비스 이용 안내 및 동의</p>
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/10 p-5 mb-6 space-y-4">
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              서비스 이용 안내사항
            </h2>
            <ul className="space-y-3 text-sm text-blue-200/80">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <span>본 서비스는 <strong className="text-white">국민건강영양조사(KNHANES)</strong> 데이터를 기반으로 학습된 AI 모델을 활용하여 만성질환 발병 가능성을 예측합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <span>예측 결과는 <strong className="text-white">의학적 진단이 아니며</strong>, 참고용 정보로만 활용하시기 바랍니다. 정확한 진단은 반드시 의료 전문가와 상담하세요.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <span>입력하신 건강 데이터는 <strong className="text-white">서버에 저장되지 않으며</strong>, 분석 완료 후 즉시 폐기됩니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <span>OAuth 인증을 통해 <strong className="text-white">익명성이 보장</strong>되며, 별도의 개인정보를 수집하지 않습니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <span>세션은 브라우저 종료 시 자동으로 만료되며, 로그아웃 시 인증 토큰이 즉시 폐기됩니다.</span>
              </li>
            </ul>
          </div>

          <p className="text-blue-200/60 text-xs text-center mb-6">
            위 안내사항을 확인하셨습니까? 동의하시면 서비스를 이용하실 수 있습니다.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              거절
            </button>
            <button
              onClick={handleConsent}
              disabled={isLoading}
              className="flex-2 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isLoading ? "처리 중..." : "동의하고 시작하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
