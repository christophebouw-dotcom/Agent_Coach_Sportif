import Link from 'next/link';
import { ClientFormFields } from '@/components/ClientFormFields';
import { creerClientAction } from '../actions';

export default function NouveauClientPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Nouveau client</h1>

      <form action={creerClientAction} className="card space-y-6">
        <ClientFormFields />
        <div className="flex justify-end gap-3">
          <Link href="/clients" className="btn-secondary">
            Annuler
          </Link>
          <button type="submit" className="btn-primary">
            Créer le client
          </button>
        </div>
      </form>
    </div>
  );
}
