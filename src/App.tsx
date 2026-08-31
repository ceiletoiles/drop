import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AndroidBackButtonHandler } from './components/navigation/AndroidBackButtonHandler';
import { SplashScreen } from './components/ui/SplashScreen';
import { useAuth } from './features/auth/auth-context';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((module) => ({ default: module.AccountPage })));
const SpacesPage = lazy(() => import('./pages/SpacesPage').then((module) => ({ default: module.SpacesPage })));
const SpacePage = lazy(() => import('./pages/SpacePage').then((module) => ({ default: module.SpacePage })));
const JoinSpacePage = lazy(() => import('./pages/JoinSpacePage').then((module) => ({ default: module.JoinSpacePage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then((module) => ({ default: module.SignupPage })));
const SharePage = lazy(() => import('./pages/SharePage').then((module) => ({ default: module.SharePage })));

const LoadingScreen = () => <SplashScreen />;

const AuthRoute = ({ children }: { children: ReactNode }) => {
  const { loading, user } = useAuth();
  if (loading) {
    return <LoadingScreen />;
  }

  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { loading, user } = useAuth();
  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const App = () => (
  <>
    <AndroidBackButtonHandler />
    <Routes>
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Suspense fallback={<LoadingScreen />}>
              <LoginPage />
            </Suspense>
          </AuthRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthRoute>
            <Suspense fallback={<LoadingScreen />}>
              <SignupPage />
            </Suspense>
          </AuthRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingScreen />}>
              <DashboardPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingScreen />}>
              <AccountPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/spaces"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingScreen />}>
              <SpacesPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/spaces/:spaceId"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingScreen />}>
              <SpacePage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      {/*remove the splash link later*/}
      <Route path="/splash" element={<SplashScreen />} />
      <Route
        path="/join/:token"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <JoinSpacePage />
          </Suspense>
        }
      />
      <Route
        path="/s/:token"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <SharePage />
          </Suspense>
        }
      />
      <Route
        path="*"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <NotFoundPage />
          </Suspense>
        }
      />
    </Routes>
  </>
);
