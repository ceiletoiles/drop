import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className="min-h-screen bg-slate-950 text-white">
    <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 text-center">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">404</p>
        <h1 className="mt-4 text-4xl font-semibold">Page not found</h1>
        <p className="mt-3 text-slate-300">The route does not exist.</p>
        <Link className="mt-6 inline-flex rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-slate-950" to="/">
          Go home
        </Link>
      </div>
    </div>
  </div>
);
