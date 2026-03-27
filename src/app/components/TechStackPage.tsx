const systemImage = "";

export function TechStackPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-slate-900 mb-3" style={{ fontSize: "2rem", fontWeight: 700 }}>기술 스택 (Tech Stack)</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          AWS 클라우드 환경에서 Docker 컨테이너 기반으로 운영되며, React SPA → Nginx → FastAPI → Redis → AI Worker(MLP)의 비동기 파이프라인으로 구성됩니다.
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <img src={systemImage} alt="System Architecture" className="w-full" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Frontend", items: ["React SPA", "Nginx Proxy"] },
          { title: "Backend", items: ["FastAPI", "OAuth (Kakao/Naver)", "JWT Authentication"] },
          { title: "Message Queue", items: ["Redis", "BRPOP Blocking"] },
          { title: "AI / Infra", items: ["MLP Inference Worker", "Docker / Kubernetes (EKS)", "AWS Cloud", "GitHub CI/CD"] },
        ].map((stack) => (
          <div key={stack.title} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h3 className="text-slate-800 mb-3" style={{ fontWeight: 600 }}>{stack.title}</h3>
            <ul className="space-y-1.5">
              {stack.items.map((item) => (
                <li key={item} className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
