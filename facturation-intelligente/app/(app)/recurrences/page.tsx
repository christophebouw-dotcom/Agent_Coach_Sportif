import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { RECURRENCE_FREQUENCY_LABELS, type RecurrenceFrequency } from '@/lib/constants';
import { genererMaintenantAction, supprimerRecurrenceAction, toggleRecurrenceActiveAction } from './actions';

export default async function RecurrencesPage() {
  const user = await requireUser();
  const modeles = await prisma.recurringTemplate.findMany({
    where: { userId: user.id },
    include: { client: true },
    orderBy: { nextRunDate: 'asc' },
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Factures récurrentes</h1>
        <div className="flex gap-3">
          <form action={genererMaintenantAction}>
            <button type="submit" className="btn-secondary">
              Générer les échéances dues
            </button>
          </form>
          <Link href="/recurrences/nouvelle" className="btn-primary">
            + Nouveau modèle
          </Link>
        </div>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Chaque modèle génère automatiquement un brouillon de facture à sa date d'échéance — il ne reste qu'à vérifier et
        cliquer sur « Émettre &amp; envoyer ». Un plan de production réel exécuterait « Générer les échéances dues »
        chaque jour via une tâche planifiée (voir le README).
      </p>

      <div className="card">
        {modeles.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Aucun modèle récurrent pour l'instant.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Client</th>
                <th>Fréquence</th>
                <th>Prochaine échéance</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {modeles.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium text-slate-900">{m.label}</td>
                  <td>{m.client.name}</td>
                  <td>{RECURRENCE_FREQUENCY_LABELS[m.frequency as RecurrenceFrequency]}</td>
                  <td>{new Intl.DateTimeFormat('fr-FR').format(m.nextRunDate)}</td>
                  <td>
                    <span className={`badge ${m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {m.active ? 'Actif' : 'En pause'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-3">
                      <form action={toggleRecurrenceActiveAction.bind(null, m.id)}>
                        <button type="submit" className="text-sm text-brand-600 hover:underline">
                          {m.active ? 'Mettre en pause' : 'Réactiver'}
                        </button>
                      </form>
                      <form action={supprimerRecurrenceAction.bind(null, m.id)}>
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
