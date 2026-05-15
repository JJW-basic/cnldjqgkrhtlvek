import { useState } from 'react';
import diagramImage from '../../asets/images/Architecture_Diagram.png';
import workflowImage from '../../asets/images/Architecture_Workflow.png';

export function TechStackPage() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-slate-900 mb-3" style={{ fontSize: "2rem", fontWeight: 700 }}>기술 스택 (Tech Stack)</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          AWS 클라우드 환경에서 Docker 컨테이너 기반으로 운영되며, React SPA → Nginx → FastAPI → Redis → AI Worker(MLP)의 비동기 파이프라인으로 구성됩니다.
        </p>
      </div>
      
      <div 
        className="mb-8 cursor-pointer w-full group"
        onClick={() => setIsFlipped(!isFlipped)}
        style={{ perspective: "1000px" }}
      >
        <div className="text-center mb-2 text-sm text-slate-500 animate-pulse">
          클릭하여 {isFlipped ? '아키텍처 다이어그램' : '워크플로우'} 보기
        </div>
        <div 
          className="relative w-full rounded-2xl border border-slate-200 shadow-sm bg-white transition-transform duration-700 ease-in-out" 
          style={{ 
            transformStyle: "preserve-3d", 
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            aspectRatio: "16/9"
          }}
        >
          <img 
            src={diagramImage} 
            alt="System Architecture" 
            className="absolute top-0 left-0 w-full h-full object-contain p-4 rounded-2xl bg-white"
            style={{ backfaceVisibility: "hidden" }} 
          />
          <img 
            src={workflowImage} 
            alt="Architecture Workflow" 
            className="absolute top-0 left-0 w-full h-full object-contain p-4 rounded-2xl bg-white"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }} 
          />
        </div>
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
