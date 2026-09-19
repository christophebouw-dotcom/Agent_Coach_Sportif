import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { TAUX_TVA } from '@/lib/constants';
import { modifierProduitAction } from '../actions';

export default async function EditerProduitPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const produit = await prisma.product.findFirst({ where: { id, userId: user.id } });
  if (!produit) notFound();

  const modifierAvecId = modifierProduitAction.bind(null, produit.id);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold">Modifier {produit.label}</h1>

      <form action={modifierAvecId} className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Libellé *</label>
          <input name="label" required defaultValue={produit.label} className="input" />
        </div>
        <div>
          <label className="label">Unité</label>
          <input name="unit" defaultValue={produit.unit} className="input" />
        </div>
        <div>
          <label className="label">Prix HT (€)</label>
          <input name="unitPriceHT" type="number" step="0.01" min="0" required defaultValue={produit.unitPriceHT} className="input" />
        </div>
        <div>
          <label className="label">TVA (%)</label>
          <select name="vatRate" defaultValue={produit.vatRate} className="input">
            {TAUX_TVA.map((taux) => (
              <option key={taux} value={taux}>
                {taux}%
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <input name="description" defaultValue={produit.description} className="input" />
        </div>
        <div className="sm:col-span-2 flex justify-end gap-3">
          <Link href="/produits" className="btn-secondary">
            Annuler
          </Link>
          <button type="submit" className="btn-primary">
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
