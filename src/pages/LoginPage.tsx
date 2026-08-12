import { Navigate, Link } from 'react-router-dom';
import { AuthShell } from '../components/layout/AuthShell';
import { AuthForm } from '../features/auth/AuthForm';
import { useAuth } from '../features/auth/auth-context';

export const LoginPage = () => {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/" replace />;

  return (
    <AuthShell>
      <div className="w-full max-w-md">
        <AuthForm mode="login" />
        <p className="mt-4 text-center text-sm text-slate-500">
          Need an account? <Link to="/signup" className="font-medium text-slate-950 underline">Sign up</Link>
        </p>
      </div>
    </AuthShell>
  );
};
