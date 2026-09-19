import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { supprimerClientAction } from './actions';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const user = await requireUser();
  const { erreur } = await searchParams;

  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
    include: { _count: { select: { invoices: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link href="/clients/nouveau" className="btn-primary">
          + Nouveau client
        </Link>
      </div>

      {erreur ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erreur}</p> : null}

      <div className="card">
        {clients.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Aucun client pour l'instant.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Ville</th>
                <th>Factures</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="font-medium text-slate-900">{client.name}</td>
                  <td>{client.email || '—'}</td>
                  <td>{client.city || '—'}</td>
                  <td>{client._count.invoices}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-3">
                      <Link href={`/clients/${client.id}`} className="text-sm text-brand-600 hover:underline">
                        Modifier
                      </Link>
                      <form action={supprimerClientAction.bind(null, client.id)}>
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
