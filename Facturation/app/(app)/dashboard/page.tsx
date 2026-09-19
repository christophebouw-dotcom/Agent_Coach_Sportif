import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { caParMois, detecterAnomalies, indicateursTresorerie, previsionTresorerie } from '@/lib/forecast';
import { formaterMontant } from '@/lib/calculations';
import { envoyerRelancesMaintenantAction, genererRecurrentesMaintenantAction } from './actions';

export default async function DashboardPage() {
  const user = await requireUser();

  const [ca, tresorerie, tranches, anomalies] = await Promise.all([
    caParMois(user.id),
    indicateursTresorerie(user.id),
    previsionTresorerie(user.id),
    detecterAnomalies(user.id),
  ]);

  const caMax = Math.max(1, ...ca.map((p) => p.montantTTC));
  const trancheMax = Math.max(1, ...tranches.map((t) => t.montant));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <div className="flex gap-3">
          <form action={genererRecurrentesMaintenantAction}>
            <button type="submit" className="btn-secondary">
              Générer les factures récurrentes dues
            </button>
          </form>
          <form action={envoyerRelancesMaintenantAction}>
            <button type="submit" className="btn-secondary">
              Envoyer les relances dues
            </button>
          </form>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Encours total</p>
          <p className="text-2xl font-semibold">{formaterMontant(tresorerie.encoursTotal)}</p>
          <p className="text-xs text-slate-400">{tresorerie.nombreImpayees} facture(s) non soldée(s)</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Dont en retard</p>
          <p className="text-2xl font-semibold text-red-600">{formaterMontant(tresorerie.enRetardTotal)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">CA du mois en cours</p>
          <p className="text-2xl font-semibold">{formaterMontant(ca.at(-1)?.montantTTC ?? 0)}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Chiffre d'affaires facturé (12 derniers mois)</h2>
          <div className="flex h-40 items-end gap-2">
            {ca.map((p) => (
              <div key={p.mois} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-brand-500"
                  style={{ height: `${Math.max(4, (p.montantTTC / caMax) * 100)}%` }}
                  title={formaterMontant(p.montantTTC)}
                />
                <span className="text-[10px] text-slate-400">{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Prévision de trésorerie (encours par échéance)</h2>
          <div className="space-y-2">
            {tranches.map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-slate-500">{t.label}</span>
                <div className="h-3 flex-1 rounded-full bg-slate-100">
                  <div
                    className={`h-3 rounded-full ${t.label === 'En retard' ? 'bg-red-500' : 'bg-brand-500'}`}
                    style={{ width: `${(t.montant / trancheMax) * 100}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-medium">{formaterMontant(t.montant)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {anomalies.length > 0 ? (
        <div className="card mb-6 border-amber-200 bg-amber-50">
          <h2 className="mb-3 text-sm font-semibold text-amber-800">Anomalies détectées sur des brouillons récents</h2>
          <ul className="space-y-2 text-sm">
            {anomalies.map((a) => (
              <li key={a.factureId} className="flex items-center justify-between">
                <span>
                  <strong>{a.client}</strong> — {a.message}
                </span>
                <Link href={`/factures/${a.factureId}`} className="text-brand-700 hover:underline">
                  Vérifier
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
