```mermaid
graph TD
    User([👨‍💻 사용자])
    
    subgraph AWS_ENV ["☁️ Amazon Web Services (EC2 m7i-flex.large x86_64)"]
        direction TB
        Nginx[Nginx Reverse Proxy<br>React SPA 서빙]
        Certbot[Certbot<br>SSL 자동 갱신]
        DuckDNS[Duck DNS<br>동적 도메인 연결]
        
        React[React SPA<br>Vite / TypeScript]
        
        subgraph Backend_Pipeline ["Docker Compose 내부 네트워크 (ws)"]
            direction LR
            FastAPI[FastAPI Server<br>비동기 API]
            Redis[(Redis<br>Task Queue & Cache)]
            AIWorker[AI Worker<br>MLP 모델 / PyTorch]
        end
    end

    subgraph External_Services [외부 연동 서비스]
        OAuth[OAuth 2.0<br>Kakao / Naver]
    end

    subgraph CI_CD_Pipeline [CI/CD 및 배포 자동화]
        direction TB
        Github[GitHub Actions<br>Pytest / Ruff 검증]
        Buildx[Docker Buildx<br>x86_64 단일 빌드]
    end

    %% Flow connections
    DuckDNS -. "IP 매핑" .-> Nginx
    Certbot -. "SSL 발급" .-> Nginx
    User -- "HTTPS (443)" --> Nginx
    Nginx -- "1. 정적 파일 로드" --> React
    
    React -- "2. 인증 요청" --> OAuth
    OAuth -- "3. Auth Code 반환" --> FastAPI
    FastAPI -- "4. JWT 발급" --> React
    
    React -- "5. 80문항 제출 (POST)" --> FastAPI
    FastAPI -- "6. Task Enqueue" --> Redis
    Redis -- "7. BRPOP 대기 및 Fetch" --> AIWorker
    AIWorker -- "8. 추론 결과 반환" --> Redis
    FastAPI -- "9. Polling" --> Redis
    FastAPI -- "10. 분석 결과 응답" --> React
    React -. "11. 대시보드 시각화" .-> User
    
    Github -- "1. 테스트 통과 후 빌드" --> Buildx
    Buildx -- "2. 이미지 푸시 및 AWS 배포" --> AWS_ENV
    
    classDef infra fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,stroke-dasharray:5 5;
    classDef proxy fill:#f1f5f9,stroke:#64748b,stroke-width:2px;
    classDef frontend fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1e40af;
    classDef backend fill:#e0f2fe,stroke:#0ea5e9,stroke-width:2px,color:#075985;
    classDef db fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#92400e;
    classDef ai fill:#dcfce3,stroke:#22c55e,stroke-width:2px,color:#14532d;
    classDef external fill:#fff1f2,stroke:#f43f5e,stroke-width:2px;
    
    class AWS_ENV infra;
    class Nginx,Certbot,DuckDNS proxy;
    class React frontend;
    class FastAPI backend;
    class Redis db;
    class AIWorker ai;
    class OAuth external;
    class External_Services external;
    class CI_CD_Pipeline proxy;
    ```