'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { registerAction, type RegisterState } from './actions';

const initialState: RegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Création…' : 'Créer mon compte'}
    </button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useFormState(registerAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm card">
        <h1 className="mb-1 text-xl font-semibold">Créer un compte</h1>
        <p className="mb-6 text-sm text-slate-500">Vous pourrez compléter vos informations légales ensuite.</p>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="label">Votre nom</label>
            <input name="name" required className="input" />
          </div>
          <div>
            <label className="label">Nom de l'entreprise / activité</label>
            <input name="companyName" required className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input name="password" type="password" required minLength={8} className="input" />
          </div>

          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <SubmitButton />
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
