import { useNavigate } from "react-router";
import { ClipboardList, Brain, Server, Dumbbell, MessageCircle, ArrowRight, Clock } from "lucide-react";

const services = [
  { id: "survey", title: "만성질환 예측 설문", desc: "KNHANES 기반 80개 문항 설문으로 만성질환 위험도를 예측합니다", icon: ClipboardList, color: "from-blue-500 to-cyan-500", available: true, path: "/survey" },
  { id: "model", title: "AI 모델", desc: "MLP 기반 만성질환 예측 모델의 아키텍처와 작동 원리를 설명합니다", icon: Brain, color: "from-purple-500 to-pink-500", available: true, path: "/ai-model" },
  { id: "tech", title: "기술 스택 (Tech Stack)", desc: "서비스의 전체 시스템 아키텍처 및 기술 스택을 소개합니다", icon: Server, color: "from-emerald-500 to-teal-500", available: true, path: "/tech-stack" },
  { id: "challenge", title: "생활습관 개선 챌린지", desc: "건강한 생활습관을 만들기 위한 단계별 챌린지를 제공합니다", icon: Dumbbell, color: "from-orange-500 to-amber-500", available: false },
  { id: "counsel", title: "만성질환 상담", desc: "AI 기반 만성질환 전문 상담 서비스를 제공합니다", icon: MessageCircle, color: "from-rose-500 to-red-500", available: false },
];

export function ServiceSelectionPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-slate-900 mb-3" style={{ fontSize: "2rem", fontWeight: 700 }}>서비스 선택</h1>
        <p className="text-slate-500 max-w-xl mx-auto">만성질환 예측 AI 서비스에서 제공하는 다양한 기능을 이용해보세요</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s) => (
          <div
            key={s.id}
            onClick={() => s.available && s.path && navigate(s.path)}
            className={`relative group rounded-2xl border p-6 transition-all ${
              s.available
                ? "bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg cursor-pointer"
                : "bg-slate-50 border-slate-200/60 opacity-70"
            }`}
          >
            {!s.available && (
              <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs" style={{ fontWeight: 500 }}>
                <Clock className="w-3 h-3" /> 개방 예정
              </div>
            )}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 shadow-sm`}>
              <s.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-slate-900 mb-2" style={{ fontSize: "1.1rem", fontWeight: 600 }}>{s.title}</h3>
            <p className="text-slate-500 text-sm mb-4">{s.desc}</p>
            {s.available && (
              <div className="flex items-center gap-1 text-blue-600 text-sm group-hover:gap-2 transition-all" style={{ fontWeight: 500 }}>
                시작하기 <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
