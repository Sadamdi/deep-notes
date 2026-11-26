import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { createBrowserRouter, redirect } from "react-router";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { LoadingState } from "@/components/shared/PageStates";

const LandingPage = lazy(() => import("@/pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const RecoveryPage = lazy(() => import("@/pages/RecoveryPage").then((module) => ({ default: module.RecoveryPage })));
const WorkspacesPage = lazy(() => import("@/pages/WorkspacesPage").then((module) => ({ default: module.WorkspacesPage })));
const CreateWorkspacePage = lazy(() => import("@/pages/CreateWorkspacePage").then((module) => ({ default: module.CreateWorkspacePage })));
const WorkspacePage = lazy(() => import("@/pages/WorkspacePage").then((module) => ({ default: module.WorkspacePage })));
const WorkspaceGamePage = lazy(() => import("@/pages/WorkspaceGamePage").then((module) => ({ default: module.WorkspaceGamePage })));
const QuizPage = lazy(() => import("@/pages/QuizPage").then((module) => ({ default: module.QuizPage })));
const GamePage = lazy(() => import("@/pages/GamePage").then((module) => ({ default: module.GamePage })));
const JoinWorkspacePage = lazy(() => import("@/pages/JoinWorkspacePage").then((module) => ({ default: module.JoinWorkspacePage })));
const FeedPage = lazy(() => import("@/pages/FeedPage").then((module) => ({ default: module.FeedPage })));
const DiscoverPage = lazy(() => import("@/pages/DiscoverPage").then((module) => ({ default: module.DiscoverPage })));
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const FriendsPage = lazy(() => import("@/pages/FriendsPage").then((module) => ({ default: module.FriendsPage })));
const AccountSettingsPage = lazy(() => import("@/pages/AccountSettingsPage").then((module) => ({ default: module.AccountSettingsPage })));
const PublicProfilePage = lazy(() => import("@/pages/PublicProfilePage").then((module) => ({ default: module.PublicProfilePage })));
const CompanionPage = lazy(() => import("@/pages/CompanionPage").then((module) => ({ default: module.CompanionPage })));
const WorkspaceInsightsPage = lazy(() => import("@/pages/WorkspaceInsightsPage").then((module) => ({ default: module.WorkspaceInsightsPage })));
const GameSessionPage = lazy(() => import("@/pages/GameSessionPage").then((module) => ({ default: module.GameSessionPage })));
const MindMapPage = lazy(() => import("@/pages/MindMapPage").then((module) => ({ default: module.MindMapPage })));
const StudioPage = lazy(() => import("@/pages/StudioPage").then((module) => ({ default: module.StudioPage })));
const StudioPreviewPage = lazy(() => import("@/pages/StudioPreviewPage").then((module) => ({ default: module.StudioPreviewPage })));
const PublicationHandoffPage = lazy(() => import("@/pages/PublicationHandoffPage").then((module) => ({ default: module.PublicationHandoffPage })));
const WorkspaceNotesPage = lazy(() => import("@/pages/WorkspaceNotesPage").then((module) => ({ default: module.WorkspaceNotesPage })));
const WorkspaceDiscussionPage = lazy(() => import("@/pages/WorkspaceDiscussionPage").then((module) => ({ default: module.WorkspaceDiscussionPage })));
const WorkspaceClassPage = lazy(() => import("@/pages/WorkspaceClassPage").then((module) => ({ default: module.WorkspaceClassPage })));
const WorkspaceVisualizationPage = lazy(() => import("@/pages/WorkspaceVisualizationPage").then((module) => ({ default: module.WorkspaceVisualizationPage })));

function screen(Page: LazyExoticComponent<ComponentType>) {
  return <Suspense fallback={<main className="page-frame py-10"><LoadingState label="Menyiapkan halaman…"/></main>}><Page/></Suspense>;
}

export const router = createBrowserRouter([
  { path: "/", element: screen(LandingPage) },
  { path: "/login", element: screen(LoginPage) },
  { path: "/register", element: screen(RegisterPage) },
  { path: "/recover", element: screen(RecoveryPage) },
  {
    element: <ProtectedLayout />,
    children: [
      { path: "/home", element: screen(FeedPage) },
      { path: "/following", element: screen(FeedPage) },
      { path: "/saved", element: screen(FeedPage) },
      { path: "/workspaces", element: screen(WorkspacesPage) },
      { path: "/discover", element: screen(DiscoverPage) },
      { path: "/profile", element: screen(ProfilePage) },
      { path: "/friends", element: screen(FriendsPage) },
      { path: "/account", element: screen(AccountSettingsPage) },
      { path: "/users/:userId", element: screen(PublicProfilePage) },
      { path: "/studio", element: screen(StudioPage) },
      { path: "/studio/preview/:draftId", element: screen(StudioPreviewPage) },
      { path: "/publications", element: screen(PublicationHandoffPage) },
      { path: "/articles/:articleId", element: screen(PublicationHandoffPage) },
      { path: "/authors/:authorId", element: screen(PublicationHandoffPage) },
      { path: "/workspaces/new", element: screen(CreateWorkspacePage) },
      { path: "/workspaces/:notebookId", element: screen(WorkspacePage) },
      { path: "/workspaces/:notebookId/team", element: screen(WorkspaceInsightsPage) },
      { path: "/workspaces/:notebookId/companion", element: screen(CompanionPage) },
      { path: "/workspaces/:notebookId/notes", element: screen(WorkspaceNotesPage) },
      { path: "/workspaces/:notebookId/discussion", element: screen(WorkspaceDiscussionPage) },
      { path: "/workspaces/:notebookId/class", element: screen(WorkspaceClassPage) },
      { path: "/workspaces/:notebookId/visualization", element: screen(WorkspaceVisualizationPage) },
      { path: "/workspaces/:notebookId/sources/:sourceId/map", element: screen(MindMapPage) },
      { path: "/game/:notebookId/sessions/:sessionId", element: screen(GameSessionPage) },
      { path: "/game/:notebookId/quizzes/:quizId", element: screen(QuizPage) },
      { path: "/game/:notebookId", element: screen(WorkspaceGamePage) },
      { path: "/workspaces/:notebookId/sessions/:sessionId", loader: ({ params }) => redirect(`/game/${params.notebookId}/sessions/${params.sessionId}`) },
      { path: "/workspaces/:notebookId/game", loader: ({ params, request }) => { const search = new URL(request.url).search; return redirect(`/game/${params.notebookId}${search}`); } },
      { path: "/workspaces/:notebookId/quizzes/:quizId", loader: ({ params }) => redirect(`/game/${params.notebookId}/quizzes/${params.quizId}`) },
      { path: "/notebooks/:notebookId", loader: ({ params }) => redirect(`/workspaces/${params.notebookId}`) },
      { path: "/game", element: screen(GamePage) },
      { path: "/join/:token", element: screen(JoinWorkspacePage) },
    ],
  },
  { path: "*", element: screen(LandingPage) },
]);
