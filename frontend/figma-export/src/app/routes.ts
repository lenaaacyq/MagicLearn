import { createBrowserRouter } from "react-router";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import QuestionPage from "./pages/QuestionPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomePage,
  },
  {
    path: "/admin",
    Component: AdminPage,
  },
  {
    path: "/question/:type",
    Component: QuestionPage,
  },
]);