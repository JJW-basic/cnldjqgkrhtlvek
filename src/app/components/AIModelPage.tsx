const modelImage = "";

export function AIModelPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-slate-900 mb-3" style={{ fontSize: "2rem", fontWeight: 700 }}>AI 모델 아키텍처</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          국민건강영양조사(KNHANES) 원시데이터로 학습된 MLP(Multi-Layer Perceptron) 기반 만성질환 예측 모델입니다.
          80개의 건강 변수를 입력받아 4가지 만성질환(알레르기 비염, 고혈압, 당뇨병, 이상지질혈증)의 보유 가능성을 예측합니다.
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <img src={modelImage} alt="Predictor Model Architecture" className="w-full" />
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        {[
          { title: "입력 (Input)", desc: "80개 KNHANES 변수 → [Batch, Input_Dim]" },
          { title: "처리 (Processing)", desc: "Feature-wise Dropout → Stem → Stage 1/2 → Transition → Classifier" },
          { title: "출력 (Output)", desc: "[Batch, 4] — 4가지 만성질환 이진 분류" },
        ].map((item) => (
          <div key={item.title} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h3 className="text-slate-800 mb-1" style={{ fontWeight: 600 }}>{item.title}</h3>
            <p className="text-sm text-slate-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
