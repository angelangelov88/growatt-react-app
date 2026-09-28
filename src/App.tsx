import { Navigate, RouterProvider, createBrowserRouter } from "react-router";
import AppLayout from "./components/AppLayout";
import AuthRoute from "./features/auth/AuthRoute";
import ForgotPasswordPage from "./features/auth/ForgotPasswordPage";
import LoginPage from "./features/auth/LoginPage";
import MfaPage from "./features/auth/MfaPage";
import ResetPasswordPage from "./features/auth/ResetPasswordPage";
import SignUpPage from "./features/auth/SignUpPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import SettingsPage from "./features/settings/SettingsPage";

const router = createBrowserRouter([
  {
    element: <AuthRoute allow={["signedOut"]} />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignUpPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <AuthRoute allow={["needsMfa"]} />,
    children: [{ path: "/mfa", element: <MfaPage /> }],
  },
  {
    element: <AuthRoute allow={["signedIn"]} />,
    children: [
      { path: "/reset-password", element: <ResetPasswordPage /> },
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

const App = () => <RouterProvider router={router} />;

export default App;
