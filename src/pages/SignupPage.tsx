import { Navigate, Link } from 'react-router-dom';
import { AuthShell } from '../components/layout/AuthShell';
import { AuthForm } from '../features/auth/AuthForm';
import { useAuth } from '../features/auth/auth-context';

export const SignupPage = () => {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/" replace />;

  return (
    <AuthShell>
      <div className="w-full max-w-md">
        <AuthForm mode="signup" />
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="font-medium text-slate-950 underline">Log in</Link>
        </p>
      </div>
    </AuthShell>
  );
};
