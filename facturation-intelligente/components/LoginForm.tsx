'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('demo@exemple.fr');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Email ou mot de passe incorrect.');
      return;
    }

    router.push(searchParams.get('callbackUrl') || '/dashboard');
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm card">
      <h1 className="mb-1 text-xl font-semibold">Facturation Intelligente</h1>
      <p className="mb-6 text-sm text-slate-500">Connectez-vous à votre espace.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          Créer un compte
        </Link>
      </p>
      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        Compte de démo : <strong>demo@exemple.fr</strong> / <strong>demo1234</strong>
      </p>
    </div>
  );
}
