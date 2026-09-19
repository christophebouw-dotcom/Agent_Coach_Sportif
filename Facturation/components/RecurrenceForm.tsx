'use client';

import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { creerRecurrenceAction, type RecurrenceFormState } from '@/app/(app)/recurrences/actions';
import { calculerTotauxFacture, formaterMontant } from '@/lib/calculations';
import { RECURRENCE_FREQUENCIES, RECURRENCE_FREQUENCY_LABELS, TAUX_TVA } from '@/lib/constants';

type Client = { id: string; name: string };
type Produit = { id: string; label: string; unit: string; unitPriceHT: number; vatRate: number };
type Ligne = { description: string; quantity: number; unitPriceHT: number; vatRate: number };

const ligneVide = (): Ligne => ({ description: '', quantity: 1, unitPriceHT: 0, vatRate: 20 });
const initialState: RecurrenceFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? 'Création…' : 'Créer le modèle récurrent'}
    </button>
  );
}

export function RecurrenceForm({ clients, produits }: { clients: Client[]; produits: Produit[] }) {
  const [state, formAction] = useFormState(creerRecurrenceAction, initialState);
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

      <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Libellé du modèle *</label>
          <input name="label" required className="input" placeholder="Forfait mensuel — Club Exemple" />
        </div>
        <div>
          <label className="label">Client *</label>
          <select name="clientId" required defaultValue="" className="input">
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
          <label className="label">Fréquence</label>
          <select name="frequency" defaultValue="MONTHLY" className="input">
            {RECURRENCE_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {RECURRENCE_FREQUENCY_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Première génération le</label>
          <input name="nextRunDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
        </div>
        <div>
          <label className="label">Délai de paiement (jours, optionnel)</label>
          <input name="paymentTermsDays" type="number" min={1} className="input" placeholder="Valeur par défaut du compte" />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Lignes facturées à chaque échéance</h2>
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
                <input required data-testid="ligne-description" className="input" value={ligne.description} onChange={(e) => majLigne(index, { description: e.target.value })} />
              </div>
              <div className="sm:col-span-1">
                <label className="label">Qté</label>
                <input type="number" min={0.01} step="0.01" required data-testid="ligne-quantite" className="input" value={ligne.quantity} onChange={(e) => majLigne(index, { quantity: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">PU HT (€)</label>
                <input type="number" min={0} step="0.01" required data-testid="ligne-prix" className="input" value={ligne.unitPriceHT} onChange={(e) => majLigne(index, { unitPriceHT: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-1">
                <label className="label">TVA</label>
                <select className="input" value={ligne.vatRate} onChange={(e) => majLigne(index, { vatRate: Number(e.target.value) })}>
                  {TAUX_TVA.map((t) => (
                    <option key={t} value={t}>
                      {t}%
                    </option>
                  ))}
                </select>
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

        <button type="button" onClick={() => setLignes((prev) => [...prev, ligneVide()])} className="btn-secondary mt-4">
          + Ajouter une ligne
        </button>

        <div className="mt-6 flex justify-end text-sm">
          <div className="w-64 space-y-1">
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
              <span>Total TTC par échéance</span>
              <span>{formaterMontant(totaux.totalTTC)}</span>
            </div>
          </div>
        </div>
      </div>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
