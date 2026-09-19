'use client';

import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { creerFactureAction, type FactureFormState } from '@/app/(app)/factures/actions';
import { calculerTotauxFacture, formaterMontant } from '@/lib/calculations';
import { TAUX_TVA } from '@/lib/constants';

type Client = { id: string; name: string };
type Produit = { id: string; label: string; unit: string; unitPriceHT: number; vatRate: number };

type Ligne = { description: string; quantity: number; unitPriceHT: number; vatRate: number };

const ligneVide = (): Ligne => ({ description: '', quantity: 1, unitPriceHT: 0, vatRate: 20 });

const initialState: FactureFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? 'Création…' : 'Créer le brouillon'}
    </button>
  );
}

export function FactureForm({
  clients,
  produits,
  defaultPaymentTermsDays,
}: {
  clients: Client[];
  produits: Produit[];
  defaultPaymentTermsDays: number;
}) {
  const [state, formAction] = useFormState(creerFactureAction, initialState);
  const [lignes, setLignes] = useState<Ligne[]>([ligneVide()]);

  const totaux = useMemo(() => calculerTotauxFacture(lignes, false), [lignes]);

  function majLigne(index: number, patch: Partial<Ligne>) {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function appliquerProduit(index: number, produitId: string) {
    const produit = produits.find((p) => p.id === produitId);
    if (!produit) return;
    majLigne(index, { description: produit.label, unitPriceHT: produit.unitPriceHT, vatRate: produit.vatRate });
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="itemsJson" value={JSON.stringify(lignes)} />

      <div className="card grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Client *</label>
          <select name="clientId" required className="input" defaultValue="">
            <option value="" disabled>
              Choisir un client
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date de prestation *</label>
          <input name="serviceDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
        </div>
        <div>
          <label className="label">Délai de paiement (jours)</label>
          <input name="paymentTermsDays" type="number" min={1} defaultValue={defaultPaymentTermsDays} className="input" />
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Lignes de facturation</h2>
          {produits.length > 0 ? (
            <p className="text-xs text-slate-400">Choisissez une prestation du catalogue pour préremplir une ligne.</p>
          ) : null}
        </div>

        <div className="space-y-3">
          {lignes.map((ligne, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-12 sm:items-end">
              {produits.length > 0 ? (
                <div className="sm:col-span-3">
                  <label className="label">Prestation</label>
                  <select className="input" defaultValue="" onChange={(e) => appliquerProduit(index, e.target.value)}>
                    <option value="">— Libre —</option>
                    {produits.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className={produits.length > 0 ? 'sm:col-span-4' : 'sm:col-span-5'}>
                <label className="label">Description *</label>
                <input
                  required
                  data-testid="ligne-description"
                  className="input"
                  value={ligne.description}
                  onChange={(e) => majLigne(index, { description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="label">Qté</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  data-testid="ligne-quantite"
                  className="input"
                  value={ligne.quantity}
                  onChange={(e) => majLigne(index, { quantity: Number(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">PU HT (€)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  data-testid="ligne-prix"
                  className="input"
                  value={ligne.unitPriceHT}
                  onChange={(e) => majLigne(index, { unitPriceHT: Number(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="label">TVA</label>
                <select
                  className="input"
                  value={ligne.vatRate}
                  onChange={(e) => majLigne(index, { vatRate: Number(e.target.value) })}
                >
                  {TAUX_TVA.map((t) => (
                    <option key={t} value={t}>
                      {t}%
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between sm:col-span-1">
                <span className="text-sm text-slate-500">
                  {formaterMontant(ligne.quantity * ligne.unitPriceHT)}
                </span>
              </div>
              <div className="sm:col-span-12 flex justify-end">
                <button
                  type="button"
                  onClick={() => setLignes((prev) => prev.filter((_, i) => i !== index))}
                  disabled={lignes.length === 1}
                  className="text-xs text-red-600 hover:underline disabled:opacity-30"
                >
                  Retirer cette ligne
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLignes((prev) => [...prev, ligneVide()])}
          className="btn-secondary mt-4"
        >
          + Ajouter une ligne
        </button>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total HT</span>
              <span>{formaterMontant(totaux.subtotalHT)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">TVA</span>
              <span>{formaterMontant(totaux.vatTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
              <span>Total TTC</span>
              <span>{formaterMontant(totaux.totalTTC)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <label className="label">Notes (visibles sur la facture)</label>
        <textarea name="notes" rows={3} className="input" />
      </div>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
