import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  AlertTriangle, CheckCircle, Activity, Heart, TrendingUp, Wind,
  Shield, Stethoscope, Info, ArrowLeft,
} from "lucide-react";

interface Predictions {
  DJ8_pre: number;
  DI1_pre: number;
  DI2_pre: number;
  DE1_pre: number;
}

const diseaseInfo: Record<string, {
  name: string;
  icon: React.ReactNode;
  color: string;
  colorLight: string;
  desc: string;
  positiveAdvice: string;
  negativeAdvice: string;
}> = {
  DJ8_pre: {
    name: "알레르기비염",
    icon: <Wind className="h-5 w-5" />,
    color: "#6366f1",
    colorLight: "#eef2ff",
    desc: "알레르기 반응에 의한 비강 염증 관련 예측",
    positiveAdvice: "알레르기비염이 의심됩니다. 이비인후과 전문의 진료를 받아보시는 것을 권장합니다. 실내 환경 관리와 알레르기 원인 물질 회피가 도움이 될 수 있습니다.",
    negativeAdvice: "현재 알레르기비염 관련 이상 소견이 없는 것으로 예측됩니다. 계절 변화 시 비강 관리에 관심을 기울여 주세요.",
  },
  DI1_pre: {
    name: "고혈압",
    icon: <Heart className="h-5 w-5" />,
    color: "#f59e0b",
    colorLight: "#fffbeb",
    desc: "혈압 수치 이상 여부에 대한 예측",
    positiveAdvice: "고혈압이 의심됩니다. 내과 전문의 진료를 받아보시는 것을 권장합니다. 정기적인 혈압 측정과 저염식 식단, 규칙적인 운동이 혈압 관리에 도움이 됩니다.",
    negativeAdvice: "현재 고혈압 관련 이상 소견이 없는 것으로 예측됩니다. 정기적인 혈압 체크를 통해 건강을 유지해 주세요.",
  },
  DI2_pre: {
    name: "이상지질혈증",
    icon: <Activity className="h-5 w-5" />,
    color: "#14b8a6",
    colorLight: "#f0fdfa",
    desc: "혈중 지질(콜레스테롤, 중성지방 등) 수치 이상 예측",
    positiveAdvice: "이상지질혈증이 의심됩니다. 내과 전문의 진료와 혈액검사를 받아보시는 것을 권장합니다. 식이 조절과 규칙적인 유산소 운동이 지질 수치 개선에 도움이 됩니다.",
    negativeAdvice: "현재 이상지질혈증 관련 이상 소견이 없는 것으로 예측됩니다. 균형 잡힌 식습관을 유지해 주세요.",
  },
  DE1_pre: {
    name: "당뇨병",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "#8b5cf6",
    colorLight: "#f5f3ff",
    desc: "혈당 조절 이상 여부에 대한 예측",
    positiveAdvice: "당뇨병이 의심됩니다. 내과(내분비내과) 전문의 진료와 혈당 검사를 받아보시는 것을 권장합니다. 식이 조절, 규칙적인 운동, 체중 관리가 혈당 관리에 중요합니다.",
    negativeAdvice: "현재 당뇨병 관련 이상 소견이 없는 것으로 예측됩니다. 규칙적인 식습관과 적정 체중 유지를 통해 건강을 관리해 주세요.",
  },
};

const diseaseOrder = ["DI1_pre", "DI2_pre", "DJ8_pre", "DE1_pre"] as const;

const getObesityInfo = (bmi: number) => {
  if (bmi < 18.5) return { label: "저체중", color: "#3b82f6", bg: "bg-blue-50", text: "text-blue-700", advice: "체중이 정상 범위보다 낮습니다. 균형 잡힌 영양 섭취와 적절한 체중 증가가 필요할 수 있습니다." };
  if (bmi < 23) return { label: "정상", color: "#22c55e", bg: "bg-green-50", text: "text-green-700", advice: "체중이 정상 범위에 있습니다. 현재의 건강한 생활 습관을 유지해 주세요." };
  if (bmi < 25) return { label: "과체중", color: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700", advice: "체중이 정상 범위를 약간 초과했습니다. 식습관 개선과 규칙적인 운동을 통해 체중 관리에 신경 써 주세요." };
  if (bmi < 30) return { label: "1단계 비만", color: "#f97316", bg: "bg-orange-50", text: "text-orange-700", advice: "비만 단계에 해당합니다. 식이요법과 운동 계획을 세워 체중 관리를 시작하시는 것을 권장합니다." };
  if (bmi < 35) return { label: "2단계 비만", color: "#e67e22", bg: "bg-orange-50", text: "text-orange-700", advice: "고도비만 단계입니다. 전문의 진료와 체계적인 체중 관리 프로그램 참여를 권장합니다." };
  return { label: "3단계 비만", color: "#d97706", bg: "bg-amber-50", text: "text-amber-700", advice: "초고도비만 단계입니다. 전문 의료기관에서 종합적인 건강 평가를 받아보시는 것을 강력히 권장합니다." };
};

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [surveyData, setSurveyData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // 설문 페이지에서 분석 요청을 통해 이동한 경우인지 확인
  const isFromSurvey = location.state?.fromSurvey;

  useEffect(() => {
    // 설문에서 정상적으로 진입하지 않았다면 캐시 무시하고 즉시 종료
    if (!isFromSurvey) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      const r = sessionStorage.getItem("predictionResults");
      const a = sessionStorage.getItem("surveyAnswers");
      if (r) setPredictions(JSON.parse(r));
      if (a) setSurveyData(JSON.parse(a));
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isFromSurvey]);

  const height = parseFloat(surveyData?.HE_ht || "0");
  const weight = parseFloat(surveyData?.HE_wt || "0");
  const waist = parseFloat(surveyData?.HE_wc || "0");
  const bmi = useMemo(() => {
    const h = height / 100;
    return h > 0 && weight > 0 ? weight / (h * h) : 0;
  }, [height, weight]);
  const obesityInfo = useMemo(() => getObesityInfo(bmi), [bmi]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Header Skeleton */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-48 bg-slate-200 rounded" />
              </div>
            </div>
            <div className="w-24 h-9 bg-slate-200 rounded-lg" />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Banner Skeleton */}
          <div className="h-14 bg-slate-200 rounded-xl animate-pulse" />

          {/* 5 Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 text-center animate-pulse border border-slate-100 shadow-sm">
                <div className="h-3 w-16 bg-slate-200 rounded mx-auto mb-4" />
                <div className="w-14 h-14 bg-slate-200 rounded-full mx-auto mb-3" />
                <div className="h-3 w-20 bg-slate-200 rounded mx-auto" />
              </div>
            ))}
          </div>

          {/* Big Card Skeleton */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 animate-pulse">
            <div className="h-1 bg-slate-200" />
            <div className="p-6">
              <div className="flex gap-2 mb-6">
                <div className="w-9 h-9 rounded-lg bg-slate-200" />
                <div className="space-y-2 flex-1 pt-1">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-48 bg-slate-200 rounded" />
                </div>
              </div>
              <div className="h-40 bg-slate-100 rounded-lg" />
            </div>
          </div>

          {/* 2x2 Grid Skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-5 animate-pulse border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      <div className="w-9 h-9 rounded-lg bg-slate-200" />
                      <div className="h-4 w-24 bg-slate-200 rounded mt-2" />
                    </div>
                    <div className="h-6 w-16 bg-slate-200 rounded-full" />
                  </div>
                  <div className="h-3 w-full bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-3/4 bg-slate-200 rounded mb-4" />
                  <div className="h-12 bg-slate-100 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!predictions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full mx-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-slate-900 mb-2" style={{ fontSize: "1.25rem", fontWeight: 600 }}>분석 결과가 없습니다</h2>
          <p className="text-slate-500 mb-6">설문을 먼저 완료해 주세요.</p>
          <button onClick={() => navigate("/survey")} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
            설문 시작하기
          </button>
        </div>
      </div>
    );
  }

  const positiveCount = Object.values(predictions).filter((v) => v === 1).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900" style={{ fontSize: "1.1rem", fontWeight: 600 }}>건강 분석 대시보드</h1>
              <p className="text-sm text-slate-500">MLP 모델 예측 기반 종합 건강 리포트</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/survey")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> 재설문
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 안내 배너 */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            본 분석 결과는 국민건강영양조사 데이터를 기반으로 한 <strong>AI 예측 모델</strong>의 참고 자료이며, 의학적 진단을 대체하지 않습니다.
            정확한 진단은 반드시 전문 의료기관을 방문하여 받아 주세요.
          </p>
        </div>

        {/* 종합 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 분석 요약 */}
          <div className="bg-white rounded-xl shadow-sm p-5 text-center">
            <p className="text-sm text-slate-500 mb-3">분석 요약</p>
            {positiveCount === 0 ? (
              <>
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <p className="text-green-700 text-sm">모든 항목 양호</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="h-7 w-7 text-amber-600" />
                </div>
                <p className="text-amber-700 text-sm">{positiveCount}개 항목 주의</p>
              </>
            )}
          </div>

          {/* 4대 질환 요약 */}
          {diseaseOrder.map((key) => {
            const value = predictions[key as keyof Predictions];
            const info = diseaseInfo[key];
            const isPositive = value === 1;
            return (
              <div key={key} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: info.color }}>{info.icon}</span>
                  <span className="text-sm text-slate-700">{info.name}</span>
                </div>
                {isPositive ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> 주의 필요
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-green-100 text-green-700">
                    <CheckCircle className="h-3.5 w-3.5" /> 양호
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 비만도 평가 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-400 via-green-400 to-amber-400" />
          <div className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-slate-900" style={{ fontSize: "1.1rem", fontWeight: 600 }}>비만도 평가</h2>
                <p className="text-sm text-slate-500">입력하신 신체 정보를 기반으로 산출한 결과입니다</p>
              </div>
            </div>

            {bmi > 0 ? (
              <div className="space-y-5 mt-5">
                {/* 신체 수치 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-xs text-slate-500 mb-1">신장</p>
                    <p className="text-slate-900" style={{ fontSize: "1.15rem" }}>{height}<span className="text-sm text-slate-400 ml-0.5">cm</span></p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-xs text-slate-500 mb-1">체중</p>
                    <p className="text-slate-900" style={{ fontSize: "1.15rem" }}>{weight}<span className="text-sm text-slate-400 ml-0.5">kg</span></p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-xs text-slate-500 mb-1">허리둘레</p>
                    <p className="text-slate-900" style={{ fontSize: "1.15rem" }}>{waist > 0 ? waist : "-"}<span className="text-sm text-slate-400 ml-0.5">{waist > 0 ? "cm" : ""}</span></p>
                  </div>
                </div>

                {/* BMI 게이지 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">BMI (체질량지수)</span>
                    <div className="flex items-center gap-2">
                      <span style={{ color: obesityInfo.color, fontSize: "1.5rem", fontWeight: 700 }}>{bmi.toFixed(1)}</span>
                      <span className={`text-sm px-2.5 py-0.5 rounded-full ${obesityInfo.bg} ${obesityInfo.text}`}>
                        {obesityInfo.label}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden bg-slate-100">
                    <div className="absolute inset-0 flex">
                      <div className="h-full bg-blue-300" style={{ width: "18.5%" }} />
                      <div className="h-full bg-green-400" style={{ width: "13.5%" }} />
                      <div className="h-full bg-amber-300" style={{ width: "7%" }} />
                      <div className="h-full bg-orange-300" style={{ width: "15%" }} />
                      <div className="h-full bg-orange-400" style={{ width: "15%" }} />
                      <div className="h-full bg-amber-500" style={{ width: "31%" }} />
                    </div>
                    <div
                      className="absolute top-0 h-full w-0.5 bg-slate-800"
                      style={{ left: `${Math.min(Math.max((bmi / 40) * 100, 2), 98)}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rounded-full border-2 border-white" />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>저체중</span><span>정상</span><span>과체중</span><span>비만</span>
                  </div>
                </div>

                {/* 비만 평가 메시지 */}
                <div className={`p-3 rounded-lg text-sm ${obesityInfo.bg} ${obesityInfo.text}`}>
                  <div className="flex gap-2">
                    <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>{obesityInfo.advice}</p>
                  </div>
                </div>

                {/* 허리둘레 판정 */}
                {waist > 0 && (
                  <div className={`p-3 rounded-lg text-sm ${
                    (surveyData?.sex === "0" ? waist >= 90 : waist >= 85)
                      ? "bg-amber-50 text-amber-800"
                      : "bg-green-50 text-green-800"
                  }`}>
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>
                        {surveyData?.sex === "0"
                          ? waist >= 90
                            ? `허리둘레(${waist}cm)가 남성 기준(90cm)을 초과하여 복부비만에 해당합니다. 내장지방 관리가 필요합니다.`
                            : `허리둘레(${waist}cm)가 남성 기준(90cm) 미만으로 정상 범위입니다.`
                          : waist >= 85
                            ? `허리둘레(${waist}cm)가 여성 기준(85cm)을 초과하여 복부비만에 해당합니다. 내장지방 관리가 필요합니다.`
                            : `허리둘레(${waist}cm)가 여성 기준(85cm) 미만으로 정상 범위입니다.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-500">신체 계측 데이터가 입력되지 않아 비만도를 평가할 수 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 질환별 상세 분석 */}
        <div>
          <h2 className="text-slate-900 mb-4" style={{ fontSize: "1.1rem", fontWeight: 600 }}>질환별 상세 분석</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diseaseOrder.map((key) => {
              const value = predictions[key as keyof Predictions];
              const info = diseaseInfo[key];
              const isPositive = value === 1;
              return (
                <div key={key} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="h-1" style={{ backgroundColor: info.color }} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: info.colorLight }}>
                          <span style={{ color: info.color }}>{info.icon}</span>
                        </div>
                        <span className="text-slate-900" style={{ fontWeight: 600 }}>{info.name}</span>
                      </div>
                      {isPositive ? (
                        <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" /> 주의
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-green-100 text-green-700">
                          <CheckCircle className="h-3.5 w-3.5" /> 양호
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mb-4 ml-11">{info.desc}</p>
                    <div className={`p-3 rounded-lg text-sm ${isPositive ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"}`}>
                      <div className="flex gap-2">
                        {isPositive ? (
                          <Stethoscope className="h-4 w-4 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        )}
                        <p>{isPositive ? info.positiveAdvice : info.negativeAdvice}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 일반 건강 관리 권장 사항 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-slate-900 mb-4" style={{ fontSize: "1.1rem", fontWeight: 600 }}>일반 건강 관리 권장 사항</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl">
              <h4 className="text-blue-700 mb-2" style={{ fontWeight: 600 }}>식습관 관리</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>- 균형 잡힌 영양소 섭취</li>
                <li>- 나트륨 섭취 줄이기</li>
                <li>- 채소/과일 충분히 섭취</li>
                <li>- 규칙적인 식사 시간</li>
              </ul>
            </div>
            <div className="p-4 bg-green-50 rounded-xl">
              <h4 className="text-green-700 mb-2" style={{ fontWeight: 600 }}>운동 관리</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>- 주 150분 이상 유산소 운동</li>
                <li>- 주 2회 이상 근력 운동</li>
                <li>- 장시간 앉기 피하기</li>
                <li>- 일상 속 걷기</li>
              </ul>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl">
              <h4 className="text-purple-700 mb-2" style={{ fontWeight: 600 }}>생활습관 관리</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>- 금연 및 절주</li>
                <li>- 충분한 수면 (7~8시간)</li>
                <li>- 스트레스 관리</li>
                <li>- 정기 건강검진 수검</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="text-center pb-8">
          <button
            onClick={() => navigate("/survey")}
            className="px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            다시 설문하기
          </button>
        </div>
      </div>
    </div>
  );
}
