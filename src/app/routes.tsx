import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedLayout } from "./components/ProtectedLayout";
import { GuestRoute } from "./components/GuestRoute";
import { ConsentRoute } from "./components/ConsentRoute";
import { LoginPage } from "./components/LoginPage";
import { OAuthCallbackPage } from "./components/OAuthCallbackPage";
import { ConsentPage } from "./components/ConsentPage";
import { ServiceSelectionPage } from "./components/ServiceSelectionPage";
import { SurveyPage } from "./components/SurveyPage";
import { DashboardPage } from "./components/DashboardPage";
import { AIModelPage } from "./components/AIModelPage";
import { TechStackPage } from "./components/TechStackPage";

/**
 * 라우트 접근 제어 매트릭스:
 *
 * /                → GuestRoute:   토큰 없음 → LoginPage, 토큰 있음 → /services
 * /oauth/callback  → 공개:         OAuth 인가 코드 수신 후 /consent로 이동
 * /consent         → ConsentRoute: 토큰 없음 + oauth_pending_code 있음만 허용
 *                                  토큰 있음 → /services, pending_code 없음 → /
 * /services 등     → ProtectedLayout: 토큰 있음만 허용, 없으면 /
 */
export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      // 기준 6: 토큰 없는 사용자 기본 페이지 = 로그인 페이지
      // 기준 7: 토큰 있는 사용자 → /services 리다이렉트
      {
        Component: GuestRoute,
        children: [{ index: true, Component: LoginPage }],
      },
      // OAuth 콜백: 인가 코드 수신 → sessionStorage 임시 저장 → /consent 이동
      { path: "oauth/callback/:provider", Component: OAuthCallbackPage },
      // 기준 3/4: ConsentRoute가 접근 조건 강제
      //   - 토큰 없음 + oauth_pending_code 있음만 허용
      {
        Component: ConsentRoute,
        children: [{ path: "consent", Component: ConsentPage }],
      },
      // 기준 2/5: ProtectedLayout이 토큰 검증 강제
      {
        Component: ProtectedLayout,
        children: [
          { path: "services", Component: ServiceSelectionPage },
          { path: "survey", Component: SurveyPage },
          { path: "dashboard", Component: DashboardPage },
          { path: "ai-model", Component: AIModelPage },
          { path: "tech-stack", Component: TechStackPage },
        ],
      },
    ],
  },
]);
