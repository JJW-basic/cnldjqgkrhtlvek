import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Check, Send, Zap, FlaskConical, Save, RotateCcw, Trophy, Target, Flame, Star, PartyPopper, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { surveySections, SurveyQuestion, healthyMaleDummyData } from "./surveyData";
import { apiFetch } from "../lib/apiClient";

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

  // 초기 상태는 빈 객체로 설정하여 페이지 진입 시 설문이 비어있도록 함
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [inferenceStep, setInferenceStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

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

  // 최초 마운트 시 브라우저 로컬 저장소에 저장된 내역이 있는지 확인
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const count = Object.keys(parsed).length;
        if (count > 0) {
          setSavedCount(count);
          setShowRestoreBanner(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // 비동기 추론 단계 텍스트 전환 타이머
  useEffect(() => {
    if (!submitting) {
      setInferenceStep(0);
      return;
    }
    const timer = setInterval(() => {
      setInferenceStep((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(timer);
  }, [submitting]);

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

  // answers 파라미터를 받아 직접 제출 가능 (자동입력&분석 버튼에서 호출 시 state 비동기 문제 우회)
  const handleSubmit = async (overrideAnswers?: Record<string, string>) => {
    const submitData = overrideAnswers ?? answers;
    setSubmitting(true);
    try {
      // 1) 태스크 제출 — 실제 AI 모델에 데이터 전달
      const submitRes = await apiFetch("/api/v1/prediction/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey_data: submitData }),
      });
      if (!submitRes.ok) throw new Error("예측 요청 실패");
      const { task_id } = await submitRes.json();

      // 2) 결과 폴링 (최대 60초, 2초 간격)
      let result = null;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await apiFetch(`/api/v1/prediction/${task_id}`);
        if (!pollRes.ok) continue;
        const data = await pollRes.json();
        if (data.status === "completed") { result = data.result; break; }
        if (data.status === "error") throw new Error("AI 추론 오류");
      }
      if (!result) throw new Error("분석 시간 초과");

      sessionStorage.setItem("surveyAnswers", JSON.stringify(submitData));
      sessionStorage.setItem("predictionResults", JSON.stringify(result));
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SECTION_KEY);
      navigate("/dashboard", { state: { fromSurvey: true } });
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

  // 더미 데이터 입력 후 실제 AI 모델 추론 요청 (mock 결과 사용 X)
  const handleAutoFillAndAnalyze = async () => {
    setFillingAnimation(true);
    const dummyAnswers = { ...healthyMaleDummyData };
    setAnswers(dummyAnswers);
    setShowRestoreBanner(false);
    setTimeout(() => setFillingAnimation(false), 800);
    // setAnswers는 비동기이므로 dummyAnswers를 직접 전달
    await handleSubmit(dummyAnswers);
  };

  const handleRestore = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setAnswers(parsed);
        toast.success("이전 설문 답변을 성공적으로 복원했습니다.");
      }
      const savedSec = localStorage.getItem(SECTION_KEY);
      if (savedSec) {
        setCurrentSection(parseInt(savedSec, 10));
      }
    } catch {
      toast.error("저장된 설문을 복원하는 중 오류가 발생했습니다.");
    }
    setShowRestoreBanner(false);
  };

  const handleClearSave = () => {
    const confirmClear = window.confirm("작성 중인 설문 데이터가 영구 삭제됩니다. 계속하시겠습니까?");
    if (!confirmClear) return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SECTION_KEY);
    setAnswers({});
    setSavedCount(0);
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

      {/* 복원 배너 - 저장된 문항이 있고 아직 현재 설문 작성(answeredCount)을 시작하지 않은 경우 노출 */}
      {showRestoreBanner && savedCount > 0 && answeredCount === 0 && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <Save className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-blue-800 text-sm truncate">
              <span style={{ fontWeight: 600 }}>저장된 설문</span>
              <span className="hidden sm:inline"> — {savedCount}개 문항 자동 저장됨</span>
              <span className="sm:hidden"> ({savedCount}문항)</span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleRestore}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              이어하기
            </button>
            <button
              onClick={handleClearSave}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
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
              disabled={fillingAnimation || submitting}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-sm disabled:opacity-50"
              style={{ fontWeight: 600 }}
            >
              <Zap className="w-3.5 h-3.5" /> {submitting ? "AI 분석 중..." : "자동 입력 & 분석"}
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
              샘플 데이터를 자동으로 입력하여 실제 AI 모델에 추론을 요청합니다.
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
              disabled={fillingAnimation || submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors text-sm disabled:opacity-50"
              style={{ fontWeight: 600 }}
            >
              <Zap className="w-3.5 h-3.5" /> {submitting ? "AI 분석 중..." : "자동 입력 & 분석"}
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
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-rose-600 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 transition-all px-3 py-1.5 rounded-lg shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 초기화
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

        <div className="flex items-center gap-2">
          {/* 모든 설문이 완료된 경우 어느 섹션에서든 분석 요청 활성화 */}
          {progress === 100 && (
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md text-sm sm:text-base"
            >
              <Send className="w-4 h-4" /> {submitting ? "분석 중..." : "분석 요청"}
            </button>
          )}

          {currentSection < surveySections.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            // 마지막 섹션에서 아직 미완료 상태일 때만 비활성화된 분석 요청 버튼 표시
            progress < 100 && (
              <button
                onClick={() => handleSubmit()}
                disabled={true}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white opacity-50 cursor-not-allowed transition-all shadow-md text-sm sm:text-base"
              >
                <Send className="w-4 h-4" /> 분석 요청
              </button>
            )
          )}
        </div>
      </div>

      {/* AI 추론 중 글라스모픽 로딩 스크린 오버레이 */}
      {submitting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-6 animate-fade-in">
            <div className="relative flex items-center justify-center w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
              <div className="relative rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 p-5 shadow-lg">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-slate-900 font-bold" style={{ fontSize: "1.3rem" }}>AI 분석을 수행하고 있습니다</h3>
              <p className="text-sm text-slate-500 min-h-[48px] px-2 transition-all duration-300">
                {inferenceStep === 0 && "입력하신 건강 설문 데이터를 분석용 피처 데이터로 변환 중..."}
                {inferenceStep === 1 && "만성질환 예측 AI 모델 추론 중 (고혈압, 당뇨병, 알레르기 비염, 이상지질혈증)..."}
                {inferenceStep === 2 && "개인화된 생활습관 개선 가이드라인 및 위험 등급 생성 중..."}
              </p>
            </div>
            {/* 진행 단계 인디케이터 */}
            <div className="flex items-center gap-2 w-full max-w-[240px]">
              {[0, 1, 2].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    inferenceStep >= step ? "bg-blue-600" : "bg-slate-100"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
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