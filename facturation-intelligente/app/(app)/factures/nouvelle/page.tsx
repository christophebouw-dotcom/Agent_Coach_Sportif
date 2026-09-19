import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { FactureForm } from '@/components/FactureForm';

export default async function NouvelleFacturePage() {
  const user = await requireUser();

  const [clients, produits] = await Promise.all([
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { userId: user.id }, orderBy: { label: 'asc' } }),
  ]);

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nouvelle facture</h1>
        <Link href="/factures" className="btn-secondary">
          Annuler
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="card">
          <p className="mb-4 text-sm text-slate-600">
            Vous devez d'abord créer un client avant de pouvoir émettre une facture.
          </p>
          <Link href="/clients/nouveau" className="btn-primary">
            Créer un client
          </Link>
        </div>
      ) : (
        <FactureForm clients={clients} produits={produits} defaultPaymentTermsDays={user.paymentTermsDays} />
      )}
    </div>
  );
}
