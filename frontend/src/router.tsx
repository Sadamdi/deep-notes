import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { HomePage } from "./pages/HomePage";
import { NotebookPage } from "./pages/NotebookPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "notebooks/:notebookId", element: <NotebookPage /> },
    ],
  },
]);
