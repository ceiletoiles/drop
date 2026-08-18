import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './features/auth/auth-context';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AccountPage } from './pages/AccountPage';
import { SignupPage } from './pages/SignupPage';
import { Spinner } from './components/ui/Spinner';

const AuthRoute = ({ children }: { children: ReactNode }) => {
  const { loading, user } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-700">
        <Spinner />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { loading, user } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-700">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const App = () => (
  <Routes>
    <Route
      path="/login"
      element={
        <AuthRoute>
          <LoginPage />
        </AuthRoute>
      }
    />
    <Route
      path="/signup"
      element={
        <AuthRoute>
          <SignupPage />
        </AuthRoute>
      }
    />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/account"
      element={
        <ProtectedRoute>
          <AccountPage />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
