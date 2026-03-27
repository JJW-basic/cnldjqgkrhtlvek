import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Check, Send, Zap, FlaskConical, Save, RotateCcw, Trophy, Target, Flame, Star, PartyPopper } from "lucide-react";
import { toast, Toaster } from "sonner";
import { surveySections, SurveyQuestion, healthyMaleDummyData } from "./surveyData";

const STORAGE_KEY = "survey_autosave";
const SECTION_KEY = "survey_section";

// 마일스톤 정의
const milestones = [
  { pct: 10, icon: <Flame className="w-4 h-4" />, msg: "좋은 출발이에요! 10% 완료" },
  { pct: 25, icon: <Target className="w-4 h-4" />, msg: "25% 달성! 순조롭게 진행 중이에요" },
  { pct: 50, icon: <Star className="w-4 h-4" />, msg: "절반을 넘었어요! 50% 완료" },
  { pct: 75, icon: <Trophy className="w-4 h-4" />, msg: "거의 다 왔어요! 75% 완료" },
  { pct: 100, icon: <PartyPopper className="w-4 h-4" />, msg: "모든 문항 완료! 분석을 요청해 주세요" },
];

export function SurveyPage() {
  const navigate = useNavigate();

  // localStorage에서 복원
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [currentSection, setCurrentSection] = useState(() => {
    try {
      const saved = localStorage.getItem(SECTION_KEY);
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });

  const [fillingAnimation, setFillingAnimation] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [testMenuOpen, setTestMenuOpen] = useState(false);
  const reachedMilestones = useRef<Set<number>>(new Set());

  const totalQuestions = surveySections.reduce((a, s) => a + s.questions.length, 0);
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / totalQuestions) * 100);
  const section = surveySections[currentSection];

  const isSectionComplete = section.questions.every(
    (q) => answers[q.variable] !== undefined && answers[q.variable] !== ""
  );

  // 최초 마운트 시 복원 배너
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) {
          setShowRestoreBanner(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-save: answers 변경 시 localStorage에 저장
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    setLastSaved(new Date());
  }, [answers]);

  // 섹션 변경 시 저장
  useEffect(() => {
    localStorage.setItem(SECTION_KEY, String(currentSection));
  }, [currentSection]);

  // 마일스톤 체크
  useEffect(() => {
    for (const m of milestones) {
      if (progress >= m.pct && !reachedMilestones.current.has(m.pct)) {
        reachedMilestones.current.add(m.pct);
        toast(m.msg, {
          icon: m.icon,
          duration: 3000,
          className: "milestone-toast",
        });
      }
    }
  }, [progress]);

  const setAnswer = useCallback((variable: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [variable]: value }));
  }, []);

  const handleNext = () => {
    setCurrentSection((p) => Math.min(surveySections.length - 1, p + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrev = () => {
    setCurrentSection((p) => Math.max(0, p - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? "";
      const accessToken = sessionStorage.getItem("access_token") ?? "";
      const authHeader = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };

      // 1) 태스크 제출
      const submitRes = await fetch(`${API_BASE}/api/v1/prediction/`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({ survey_data: answers }),
      });
      if (!submitRes.ok) throw new Error("예측 요청 실패");
      const { task_id } = await submitRes.json();

      // 2) 결과 폴링 (최대 60초, 2초 간격)
      let result = null;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(`${API_BASE}/api/v1/prediction/${task_id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!pollRes.ok) continue;
        const data = await pollRes.json();
        if (data.status === "completed") { result = data.result; break; }
        if (data.status === "error") throw new Error("AI 추론 오류");
      }
      if (!result) throw new Error("분석 시간 초과");

      sessionStorage.setItem("surveyAnswers", JSON.stringify(answers));
      sessionStorage.setItem("predictionResults", JSON.stringify(result));
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SECTION_KEY);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoFill = () => {
    setFillingAnimation(true);
    setAnswers({ ...healthyMaleDummyData });
    setCurrentSection(0);
    setShowRestoreBanner(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setFillingAnimation(false), 800);
  };

  const handleAutoFillAndAnalyze = () => {
    setFillingAnimation(true);
    const dummyAnswers = { ...healthyMaleDummyData };
    setAnswers(dummyAnswers);
    setTimeout(() => {
      const mockResults = { DJ8_pre: 0, DI1_pre: 0, DE1_pre: 0, DI2_pre: 0 };
      sessionStorage.setItem("surveyAnswers", JSON.stringify(dummyAnswers));
      sessionStorage.setItem("predictionResults", JSON.stringify(mockResults));
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SECTION_KEY);
      setFillingAnimation(false);
      navigate("/dashboard");
    }, 1000);
  };

  const handleClearSave = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SECTION_KEY);
    setAnswers({});
    setCurrentSection(0);
    setShowRestoreBanner(false);
    setLastSaved(null);
    reachedMilestones.current.clear();
    toast("저장된 데이터가 초기화되었습니다.", { duration: 2000 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDismissRestore = () => {
    setShowRestoreBanner(false);
  };

  // 동기부여 메시지
  const getMotivationMessage = () => {
    if (progress === 0) return "첫 번째 문항부터 시작해 볼까요?";
    if (progress < 25) return "좋은 시작이에요! 계속 진행해 주세요.";
    if (progress < 50) return "잘 하고 계세요! 절반까지 조금 남았어요.";
    if (progress < 75) return "절반을 넘었어요! 끝이 보이기 시작합니다.";
    if (progress < 100) return "거의 다 완료되었어요! 조금만 더 힘내세요.";
    return "모든 문항을 완료했습니다! 분석을 요청해 주세요.";
  };

  // 예상 남은 시간 (문항당 약 8초 가정)
  const remainingQuestions = totalQuestions - answeredCount;
  const estimatedMinutes = Math.max(1, Math.ceil((remainingQuestions * 8) / 60));

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      <Toaster position="top-center" richColors />

      {/* 복원 배너 */}
      {showRestoreBanner && answeredCount > 0 && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Save className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-blue-800 text-sm truncate">
              <span style={{ fontWeight: 600 }}>저장된 설문</span>
              <span className="hidden sm:inline"> — {answeredCount}개 문항 자동 저장됨</span>
              <span className="sm:hidden"> ({answeredCount}문항)</span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleDismissRestore}
              className="px-3 py-1.5 rounded-lg text-xs border border-blue-300 bg-white text-blue-700 hover:bg-blue-100 transition-colors"
            >
              이어하기
            </button>
            <button
              onClick={handleClearSave}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> 초기화
            </button>
          </div>
        </div>
      )}

      {/* 테스트 모드 — 모바일: 접이식 / 데스크톱: 인라인 */}
      <div className="mb-4">
        {/* 모바일 토글 버튼 */}
        <button
          onClick={() => setTestMenuOpen(!testMenuOpen)}
          className="sm:hidden w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-sm"
        >
          <span className="flex items-center gap-1.5" style={{ fontWeight: 600 }}>
            <FlaskConical className="w-3.5 h-3.5" /> 테스트 모드
          </span>
          <ChevronRight className={`w-4 h-4 transition-transform ${testMenuOpen ? "rotate-90" : ""}`} />
        </button>
        {/* 모바일 드롭다운 */}
        {testMenuOpen && (
          <div className="sm:hidden mt-2 flex gap-2 px-1">
            <button
              onClick={() => { handleAutoFill(); setTestMenuOpen(false); }}
              disabled={fillingAnimation}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-amber-400 bg-white text-amber-700 text-sm disabled:opacity-50"
              style={{ fontWeight: 500 }}
            >
              <Zap className="w-3.5 h-3.5" /> 자동 입력
            </button>
            <button
              onClick={() => { handleAutoFillAndAnalyze(); setTestMenuOpen(false); }}
              disabled={fillingAnimation}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-sm disabled:opacity-50"
              style={{ fontWeight: 600 }}
            >
              <Zap className="w-3.5 h-3.5" /> 바로 분석
            </button>
          </div>
        )}
        {/* 데스크톱 인라인 */}
        <div className="hidden sm:flex rounded-xl border-2 border-amber-300 bg-amber-50 px-5 py-4 items-center justify-between gap-4">
          <div>
            <p className="text-amber-800" style={{ fontWeight: 600 }}>
              <FlaskConical className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              테스트 모드: 빠르게 대시보드를 확인하고 싶으신가요?
            </p>
            <p className="text-amber-600 text-sm mt-0.5">
              80개 문항에 건강한 남성 데이터를 자동으로 입력하고 바로 분석합니다.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleAutoFill}
              disabled={fillingAnimation}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 border-amber-400 bg-white text-amber-700 hover:bg-amber-100 transition-colors text-sm disabled:opacity-50"
              style={{ fontWeight: 500 }}
            >
              <Zap className="w-3.5 h-3.5" /> 자동 입력
            </button>
            <button
              onClick={handleAutoFillAndAnalyze}
              disabled={fillingAnimation}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors text-sm disabled:opacity-50"
              style={{ fontWeight: 600 }}
            >
              <Zap className="w-3.5 h-3.5" /> 자동 입력 & 분석
            </button>
          </div>
        </div>
      </div>

      {fillingAnimation && (
        <div className="mb-4 text-center py-2.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-600 text-sm animate-pulse">
          건강한 남성(35세) 데이터를 자동 입력 중...
        </div>
      )}

      {/* Progress — 모바일: 컴팩트 / 데스크톱: 풀 */}
      <div className="mb-5 bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-5">
        {/* 상단 라벨 + 바 */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-0">
          {/* 모바일: 원형 진행률 + 바 한 줄 */}
          <div className="sm:hidden flex items-center gap-3 w-full">
            <div className="relative w-11 h-11 shrink-0">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle
                  cx="22" cy="22" r="18" fill="none"
                  stroke={progress < 50 ? "#3b82f6" : progress < 100 ? "#06b6d4" : "#22c55e"}
                  strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress / 100)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-700" style={{ fontWeight: 700 }}>
                {progress}%
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 truncate" style={{ fontWeight: 500 }}>{getMotivationMessage()}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400">{answeredCount}/{totalQuestions}</span>
                {remainingQuestions > 0 && (
                  <span className="text-xs text-slate-400">· 약 {estimatedMinutes}분</span>
                )}
                {lastSaved && (
                  <span className="flex items-center gap-0.5 text-xs text-green-600">
                    <Save className="w-2.5 h-2.5" /> 저장됨
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 데스크톱: 기존 풀 레이아웃 */}
          <div className="hidden sm:block">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">전체 진행률</span>
              <span className="text-sm text-blue-600" style={{ fontWeight: 600 }}>
                {answeredCount}/{totalQuestions} 문항 ({progress}%)
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: progress < 50
                    ? "linear-gradient(90deg, #3b82f6, #06b6d4)"
                    : progress < 100
                    ? "linear-gradient(90deg, #06b6d4, #22c55e)"
                    : "linear-gradient(90deg, #22c55e, #16a34a)",
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">{getMotivationMessage()}</p>
              <div className="flex items-center gap-3">
                {remainingQuestions > 0 && (
                  <span className="text-xs text-slate-400">
                    예상 잔여 시간: 약 {estimatedMinutes}분
                  </span>
                )}
                {lastSaved && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Save className="w-3 h-3" /> 자동 저장됨
                  </span>
                )}
              </div>
            </div>

            {/* 마일스톤 도트 */}
            <div className="relative mt-3 flex items-center justify-between px-1">
              {[0, 25, 50, 75, 100].map((pct) => (
                <div key={pct} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-3 h-3 rounded-full border-2 transition-all ${
                      progress >= pct
                        ? "bg-blue-500 border-blue-500"
                        : "bg-white border-slate-300"
                    }`}
                  />
                  <span className={`text-[10px] ${progress >= pct ? "text-blue-600" : "text-slate-400"}`} style={{ fontWeight: progress >= pct ? 600 : 400 }}>
                    {pct}%
                  </span>
                </div>
              ))}
              <div className="absolute top-1.5 left-2 right-2 h-px bg-slate-200 -z-10" />
              <div
                className="absolute top-1.5 left-2 h-px bg-blue-400 -z-10 transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
        {surveySections.map((s, i) => {
          const sectionDone = s.questions.every(
            (q) => answers[q.variable] !== undefined && answers[q.variable] !== ""
          );
          const sectionAnswered = s.questions.filter(
            (q) => answers[q.variable] !== undefined && answers[q.variable] !== ""
          ).length;
          const sectionPartial = sectionAnswered > 0 && !sectionDone;
          return (
            <button
              key={i}
              onClick={() => { setCurrentSection(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all whitespace-nowrap ${
                i === currentSection
                  ? "bg-blue-600 text-white shadow-md"
                  : sectionDone
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : sectionPartial
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {sectionDone && i !== currentSection && <Check className="w-3.5 h-3.5" />}
              <span>{s.icon}</span>
              <span>{s.title}</span>
              {sectionPartial && i !== currentSection && (
                <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                  {sectionAnswered}/{s.questions.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Section Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-slate-900" style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {section.icon} {section.title}
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            섹션 {currentSection + 1} / {surveySections.length}
          </p>
        </div>
        {answeredCount > 0 && (
          <button
            onClick={handleClearSave}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <RotateCcw className="w-3 h-3" /> 초기화
          </button>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-3 sm:space-y-4">
        {section.questions.map((q) => (
          <QuestionCard
            key={q.variable}
            question={q}
            value={answers[q.variable] || ""}
            onChange={(v) => setAnswer(q.variable, v)}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5 sm:mt-6 pb-6 sm:pb-8">
        <button
          onClick={handlePrev}
          disabled={currentSection === 0}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors text-sm sm:text-base"
        >
          <ChevronLeft className="w-4 h-4" /> 이전
        </button>

        {!isSectionComplete && (
          <span className="text-xs text-amber-500 hidden sm:inline">
            이 섹션의 모든 문항을 답변해 주세요
          </span>
        )}

        {currentSection < surveySections.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            다음 <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={progress < 100 || submitting}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 transition-all shadow-md text-sm sm:text-base"
          >
            <Send className="w-4 h-4" /> {submitting ? "분석 중..." : "분석 요청"}
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  const isAnswered = value !== "";

  return (
    <div
      className={`bg-white rounded-xl sm:rounded-2xl border shadow-sm px-4 sm:px-6 py-4 sm:py-5 transition-all ${
        isAnswered ? "border-blue-200 shadow-blue-50" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-2 mb-3 sm:mb-4">
        <span
          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs text-white mt-0.5"
          style={{
            background: isAnswered
              ? "linear-gradient(135deg,#3b82f6,#06b6d4)"
              : "#cbd5e1",
            fontWeight: 600,
          }}
        >
          {isAnswered ? <Check className="w-3.5 h-3.5" /> : "Q"}
        </span>
        <div>
          <p className="text-slate-800" style={{ fontWeight: 500, lineHeight: 1.5 }}>
            Q{question.id}. {question.question}
          </p>
        </div>
      </div>

      {question.type === "select" && question.options ? (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 pl-0 sm:pl-8">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-all border ${
                value === opt.value
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 pl-0 sm:pl-8">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={question.min}
            max={question.max}
            placeholder={question.placeholder ?? `${question.min ?? 0} ~ ${question.max ?? ""}`}
            className="w-full max-w-[200px] px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-700"
          />
          {question.unit && (
            <span className="text-slate-400 text-sm">{question.unit}</span>
          )}
        </div>
      )}
    </div>
  );
}