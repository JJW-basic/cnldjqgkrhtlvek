import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { LoginPage } from "./components/LoginPage";
import { ServiceSelectionPage } from "./components/ServiceSelectionPage";
import { SurveyPage } from "./components/SurveyPage";
import { DashboardPage } from "./components/DashboardPage";
import { AIModelPage } from "./components/AIModelPage";
import { TechStackPage } from "./components/TechStackPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: LoginPage },
      { path: "services", Component: ServiceSelectionPage },
      { path: "survey", Component: SurveyPage },
      { path: "dashboard", Component: DashboardPage },
      { path: "ai-model", Component: AIModelPage },
      { path: "tech-stack", Component: TechStackPage },
    ],
  },
]);
