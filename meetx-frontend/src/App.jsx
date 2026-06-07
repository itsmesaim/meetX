import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import RoomPage from "./pages/RoomPage.jsx";

function PrivateRoute({ children }) {
  const { token, logout } = useAuth(); 

  if (!token) return <Navigate to="/login" replace />;

  // Token expiry check
  try {
    const { exp } = JSON.parse(atob(token.split(".")[1]));
    if (exp * 1000 < Date.now()) {
      logout();
      return <Navigate to="/login" replace />;
    }
  } catch {
    logout();
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/room/:code"
              element={
                <PrivateRoute>
                  <RoomPage />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
