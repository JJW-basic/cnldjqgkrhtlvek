import { useNavigate } from "react-router";
import { Shield, Lock } from "lucide-react";
import logoImg from "../../asets/icons/logo.png";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function LoginPage() {
  const navigate = useNavigate();

  const handleKakaoLogin = () => {
    window.location.href = `${API_BASE}/api/v1/auth/kakao/login`;
  };

  const handleNaverLogin = () => {
    alert(
      "Naver API 검수 요청은 추후에 진행할 예정이며, 카카오 API 인증만 가능합니다.\n\n" +
      "카카오 API 인증 시 추가 정보 수집은 없으며, 인증 받지 않은 카카오 계정도 로그인이 가능합니다.\n\n" +
      "테스용 카카오 임시 계정\n" +
      " ID: test@yzcalo.com\n" +
      " PW: xptmxmdyd1!"
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 sm:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <img src={logoImg} alt="만성질환 예측 AI 로고" className="w-28 h-28 mb-4 object-contain rounded-2xl shadow-lg" />
            <h1 className="text-white text-center" style={{ fontSize: "1.5rem", fontWeight: 700 }}>만성질환 예측 AI 서비스</h1>
            <p className="text-blue-200/70 mt-2 text-center">User - AI - Doctor Collaboration</p>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={handleKakaoLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: "#FEE500", color: "#191919", fontWeight: 600 }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 2C5.03 2 1 5.13 1 8.97c0 2.48 1.65 4.66 4.13 5.88-.18.64-.65 2.33-.74 2.69-.12.45.16.44.34.32.14-.1 2.19-1.49 3.08-2.1.38.05.78.08 1.19.08 4.97 0 9-3.13 9-6.97S14.97 2 10 2z" fill="#191919" /></svg>
              카카오 로그인
            </button>
            <button
              onClick={handleNaverLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: "#03C75A", color: "#fff", fontWeight: 600 }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20"><path d="M13.5 10.5L6.2 2H2v16h4.5V9.5L13.8 18H18V2h-4.5v8.5z" fill="#fff" /></svg>
              네이버 로그인
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 text-blue-200/60">
              <Shield className="w-4 h-4 mt-0.5 shrink-0" />
              <span>OAuth 인증을 통한 익명성 보장 — 개인정보를 수집하지 않습니다</span>
            </div>
            <div className="flex items-start gap-2 text-blue-200/60">
              <Lock className="w-4 h-4 mt-0.5 shrink-0" />
              <span>JWT 토큰 기반 세션 관리로 보안성 확보</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
