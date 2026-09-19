import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { RecurrenceForm } from '@/components/RecurrenceForm';

export default async function NouvelleRecurrencePage() {
  const user = await requireUser();

  const [clients, produits] = await Promise.all([
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { userId: user.id }, orderBy: { label: 'asc' } }),
  ]);

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nouveau modèle récurrent</h1>
        <Link href="/recurrences" className="btn-secondary">
          Annuler
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="card">
          <p className="mb-4 text-sm text-slate-600">Créez d'abord un client.</p>
          <Link href="/clients/nouveau" className="btn-primary">
            Créer un client
          </Link>
        </div>
      ) : (
        <RecurrenceForm clients={clients} produits={produits} />
      )}
    </div>
  );
}
