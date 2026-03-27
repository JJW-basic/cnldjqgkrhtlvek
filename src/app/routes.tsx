import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedLayout } from "./components/ProtectedLayout";
import { LoginPage } from "./components/LoginPage";
import { OAuthCallbackPage } from "./components/OAuthCallbackPage";
import { ServiceSelectionPage } from "./components/ServiceSelectionPage";
import { SurveyPage } from "./components/SurveyPage";
import { DashboardPage } from "./components/DashboardPage";
import { AIModelPage } from "./components/AIModelPage";
import { TechStackPage } from "./components/TechStackPage";
import { useAuth } from "./lib/useAuth";

function RootRedirect() {
  const authState = useAuth();

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return authState === "authenticated" ? <Navigate to="/services" replace /> : <LoginPage />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: RootRedirect },
      { path: "oauth/callback/:provider", Component: OAuthCallbackPage },
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
