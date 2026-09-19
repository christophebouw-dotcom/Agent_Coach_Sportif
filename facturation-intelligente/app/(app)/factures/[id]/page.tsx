import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { formaterMontant } from '@/lib/calculations';
import { mentionsLegalesFacture } from '@/lib/legalMentions';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_BADGE_CLASSES, type InvoiceStatus } from '@/lib/constants';
import { emettreFactureAction, enregistrerPaiementAction, supprimerFactureAction } from '../actions';

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export default async function DetailFacturePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { erreur } = await searchParams;

  const facture = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { client: true, items: { orderBy: { position: 'asc' } }, payments: { orderBy: { date: 'desc' } }, reminders: { orderBy: { sentAt: 'desc' } } },
  });
  if (!facture) notFound();

  const solde = facture.totalTTC - facture.amountPaid;
  const mentions = mentionsLegalesFacture(user, facture);
  const emettreAction = emettreFactureAction.bind(null, facture.id);
  const paiementAction = enregistrerPaiementAction.bind(null, facture.id);
  const supprimerAction = supprimerFactureAction.bind(null, facture.id);

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{facture.number ?? 'Brouillon'}</h1>
          <p className="text-sm text-slate-500">{facture.client.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${INVOICE_STATUS_BADGE_CLASSES[facture.status as InvoiceStatus]}`}>
            {INVOICE_STATUS_LABELS[facture.status as InvoiceStatus]}
          </span>
          {facture.number ? (
            <a href={`/api/factures/${facture.id}/pdf`} className="btn-secondary" target="_blank" rel="noreferrer">
              Télécharger le PDF
            </a>
          ) : null}
        </div>
      </div>

      {erreur ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erreur}</p> : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Émission</p>
          <p className="font-medium">{formatDate(facture.issueDate)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Échéance</p>
          <p className="font-medium">{formatDate(facture.dueDate)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Solde dû</p>
          <p className="font-medium">{formaterMontant(solde)}</p>
        </div>
      </div>

      <div className="card mb-6">
        <table className="table-base">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qté</th>
              <th>PU HT</th>
              <th>TVA</th>
              <th>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {facture.items.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{formaterMontant(item.unitPriceHT)}</td>
                <td>{facture.vatExempt ? 'N/A' : `${item.vatRate}%`}</td>
                <td>{formaterMontant(item.totalHT)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total HT</span>
              <span>{formaterMontant(facture.subtotalHT)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">TVA</span>
              <span>{formaterMontant(facture.vatTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
              <span>Total TTC</span>
              <span>{formaterMontant(facture.totalTTC)}</span>
            </div>
          </div>
        </div>
      </div>

      {facture.status === 'DRAFT' ? (
        <div className="card mb-6 flex items-center justify-between">
          <div>
            <p className="font-medium">Ce brouillon n'a pas encore été émis.</p>
            <p className="text-sm text-slate-500">
              L'émission attribue le numéro légal définitif et envoie la facture par email au client (si une adresse est renseignée).
            </p>
          </div>
          <div className="flex gap-3">
            <form action={supprimerAction}>
              <button type="submit" className="btn-secondary">
                Supprimer
              </button>
            </form>
            <form action={emettreAction}>
              <button type="submit" className="btn-primary">
                Émettre &amp; envoyer
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {facture.status !== 'DRAFT' && facture.status !== 'PAID' && facture.status !== 'CANCELLED' ? (
        <div className="card mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Enregistrer un paiement</h2>
          <form action={paiementAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
            <div>
              <label className="label">Montant (€)</label>
              <input name="amount" type="number" step="0.01" min="0.01" max={solde} defaultValue={solde} required className="input" />
            </div>
            <div>
              <label className="label">Date</label>
              <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="input" />
            </div>
            <div>
              <label className="label">Mode</label>
              <select name="method" className="input" defaultValue="virement">
                <option value="virement">Virement</option>
                <option value="carte">Carte bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="especes">Espèces</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </form>
        </div>
      ) : null}

      {facture.payments.length > 0 ? (
        <div className="card mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Paiements reçus</h2>
          <ul className="space-y-2 text-sm">
            {facture.payments.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-slate-100 pb-2">
                <span>{formatDate(p.date)} — {p.method}</span>
                <span className="font-medium">{formaterMontant(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {facture.reminders.length > 0 ? (
        <div className="card mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Relances envoyées</h2>
          <ul className="space-y-2 text-sm">
            {facture.reminders.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-slate-100 pb-2">
                <span>Niveau {r.level} — {formatDate(r.sentAt)}</span>
                <span className="text-slate-500">{r.messagePreview}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card">
        <h2 className="mb-2 text-xs font-semibold uppercase text-slate-400">Mentions légales appliquées</h2>
        <ul className="space-y-1 text-xs text-slate-500">
          {mentions.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <Link href="/factures" className="text-sm text-slate-500 hover:underline">
          ← Retour aux factures
        </Link>
      </div>
    </div>
  );
}
