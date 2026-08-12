import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from './auth-context';
import { Spinner } from '../../components/ui/Spinner';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export const AuthForm = ({ mode }: AuthFormProps) => {
  const { signIn, signUp, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{mode === 'login' ? 'Log in to Drop' : 'Sign up for Drop'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {configured ? 'Use email and password to continue.' : 'Set the Supabase environment variables before signing in.'}
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <Input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading || !configured}>
          {loading ? <Spinner /> : mode === 'login' ? 'Log in' : 'Create account'}
        </Button>
      </form>
    </Card>
  );
};
