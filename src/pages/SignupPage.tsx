import { Navigate } from 'react-router-dom';
import { AuthShell } from '../components/layout/AuthShell';
import { AuthForm } from '../features/auth/AuthForm';
import { useAuth } from '../features/auth/auth-context';

export const SignupPage = () => {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/" replace />;

  return (
    <AuthShell>
      <div className="relative w-full max-w-md">
        <img src="/assets/drop.png" alt="Drop" className="absolute bottom-[calc(100%+1rem)] left-1/2 h-28 w-28 -translate-x-1/2 object-contain lg:hidden" />
        <AuthForm mode="signup" />
      </div>
    </AuthShell>
  );
};
