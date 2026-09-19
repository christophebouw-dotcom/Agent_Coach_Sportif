import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { formaterMontant } from '@/lib/calculations';
import { TAUX_TVA } from '@/lib/constants';
import { creerProduitAction, supprimerProduitAction } from './actions';

export default async function ProduitsPage() {
  const user = await requireUser();
  const produits = await prisma.product.findMany({ where: { userId: user.id }, orderBy: { label: 'asc' } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Catalogue de prestations</h1>

      <div className="mb-8 card">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Ajouter une prestation</h2>
        <form action={creerProduitAction} className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <label className="label">Libellé *</label>
            <input name="label" required className="input" placeholder="Séance de coaching individuel" />
          </div>
          <div>
            <label className="label">Unité</label>
            <input name="unit" defaultValue="séance" className="input" />
          </div>
          <div>
            <label className="label">Prix HT (€)</label>
            <input name="unitPriceHT" type="number" step="0.01" min="0" required className="input" />
          </div>
          <div>
            <label className="label">TVA (%)</label>
            <select name="vatRate" defaultValue={20} className="input">
              {TAUX_TVA.map((taux) => (
                <option key={taux} value={taux}>
                  {taux}%
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-5">
            <label className="label">Description (optionnelle)</label>
            <input name="description" className="input" />
          </div>
          <div className="sm:col-span-5 flex justify-end">
            <button type="submit" className="btn-primary">
              Ajouter
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        {produits.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Aucune prestation enregistrée.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Unité</th>
                <th>Prix HT</th>
                <th>TVA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {produits.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-slate-900">
                    {p.label}
                    {p.description ? <div className="text-xs font-normal text-slate-500">{p.description}</div> : null}
                  </td>
                  <td>{p.unit}</td>
                  <td>{formaterMontant(p.unitPriceHT)}</td>
                  <td>{p.vatRate}%</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-3">
                      <Link href={`/produits/${p.id}`} className="text-sm text-brand-600 hover:underline">
                        Modifier
                      </Link>
                      <form action={supprimerProduitAction.bind(null, p.id)}>
                        <button type="submit" className="text-sm text-red-600 hover:underline">
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
