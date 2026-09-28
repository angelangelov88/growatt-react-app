import { Navigate, RouterProvider, createBrowserRouter } from "react-router";
import AppLayout from "./components/AppLayout";
import AuthRoute from "./features/auth/AuthRoute";
import LoginPage from "./features/auth/LoginPage";
import MfaPage from "./features/auth/MfaPage";
import SignUpPage from "./features/auth/SignUpPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import SettingsPage from "./features/settings/SettingsPage";

const router = createBrowserRouter([
  {
    element: <AuthRoute allow={["signedOut"]} />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignUpPage /> },
    ],
  },
  {
    element: <AuthRoute allow={["needsMfa"]} />,
    children: [{ path: "/mfa", element: <MfaPage /> }],
  },
  {
    element: <AuthRoute allow={["signedIn"]} />,
    children: [
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
