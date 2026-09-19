import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { ClientFormFields } from '@/components/ClientFormFields';
import { modifierClientAction } from '../actions';

export default async function EditerClientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const client = await prisma.client.findFirst({ where: { id, userId: user.id } });
  if (!client) notFound();

  const modifierAvecId = modifierClientAction.bind(null, client.id);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Modifier {client.name}</h1>

      <form action={modifierAvecId} className="card space-y-6">
        <ClientFormFields client={client} />
        <div className="flex justify-end gap-3">
          <Link href="/clients" className="btn-secondary">
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
