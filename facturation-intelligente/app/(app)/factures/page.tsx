import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { formaterMontant } from '@/lib/calculations';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_BADGE_CLASSES, type InvoiceStatus } from '@/lib/constants';

const FILTRES = ['TOUTES', 'DRAFT', 'SENT', 'OVERDUE', 'PAID'] as const;

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; erreur?: string }>;
}) {
  const user = await requireUser();
  const { statut, erreur } = await searchParams;
  const filtre = (FILTRES as readonly string[]).includes(statut ?? '') ? statut! : 'TOUTES';

  const factures = await prisma.invoice.findMany({
    where: { userId: user.id, ...(filtre !== 'TOUTES' ? { status: filtre } : {}) },
    include: { client: true },
    orderBy: [{ createdAt: 'desc' }],
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Factures</h1>
        <Link href="/factures/nouvelle" className="btn-primary">
          + Nouvelle facture
        </Link>
      </div>

      {erreur ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erreur}</p> : null}

      <div className="mb-4 flex gap-2">
        {FILTRES.map((f) => (
          <Link
            key={f}
            href={f === 'TOUTES' ? '/factures' : `/factures?statut=${f}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filtre === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'TOUTES' ? 'Toutes' : INVOICE_STATUS_LABELS[f as InvoiceStatus]}
          </Link>
        ))}
      </div>

      <div className="card">
        {factures.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Aucune facture pour ce filtre.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Client</th>
                <th>Émission</th>
                <th>Échéance</th>
                <th>Montant TTC</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => (
                <tr key={f.id} className="cursor-pointer hover:bg-slate-50">
                  <td>
                    <Link href={`/factures/${f.id}`} className="font-medium text-brand-700 hover:underline">
                      {f.number ?? 'Brouillon'}
                    </Link>
                  </td>
                  <td>{f.client.name}</td>
                  <td>{new Intl.DateTimeFormat('fr-FR').format(f.issueDate)}</td>
                  <td>{new Intl.DateTimeFormat('fr-FR').format(f.dueDate)}</td>
                  <td>{formaterMontant(f.totalTTC)}</td>
                  <td>
                    <span className={`badge ${INVOICE_STATUS_BADGE_CLASSES[f.status as InvoiceStatus]}`}>
                      {INVOICE_STATUS_LABELS[f.status as InvoiceStatus]}
                    </span>
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
