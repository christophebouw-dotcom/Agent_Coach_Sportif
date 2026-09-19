'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { RECURRENCE_FREQUENCIES } from '@/lib/constants';
import { genererFacturesRecurrentesDues } from '@/lib/recurring';

const ligneSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPriceHT: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100),
});

const schema = z.object({
  clientId: z.string().min(1, 'Sélectionnez un client.'),
  label: z.string().min(1, 'Le libellé est requis.'),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  nextRunDate: z.string().min(1),
  paymentTermsDays: z.coerce.number().int().positive().optional(),
  items: z.array(ligneSchema).min(1, 'Ajoutez au moins une ligne.'),
});

export type RecurrenceFormState = { error?: string };

export async function creerRecurrenceAction(_prevState: RecurrenceFormState, formData: FormData): Promise<RecurrenceFormState> {
  const user = await requireUser();

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get('itemsJson') ?? '[]'));
  } catch {
    return { error: 'Lignes invalides.' };
  }

  const parsed = schema.safeParse({
    clientId: formData.get('clientId'),
    label: formData.get('label'),
    frequency: formData.get('frequency'),
    nextRunDate: formData.get('nextRunDate'),
    paymentTermsDays: formData.get('paymentTermsDays') || undefined,
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  }

  const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, userId: user.id } });
  if (!client) return { error: 'Client introuvable.' };

  await prisma.recurringTemplate.create({
    data: {
      userId: user.id,
      clientId: client.id,
      label: parsed.data.label,
      frequency: parsed.data.frequency,
      nextRunDate: new Date(parsed.data.nextRunDate),
      paymentTermsDays: parsed.data.paymentTermsDays,
      itemsJson: JSON.stringify(parsed.data.items),
    },
  });

  revalidatePath('/recurrences');
  redirect('/recurrences');
}

export async function toggleRecurrenceActiveAction(templateId: string) {
  const user = await requireUser();
  const modele = await prisma.recurringTemplate.findFirst({ where: { id: templateId, userId: user.id } });
  if (!modele) return;

  await prisma.recurringTemplate.update({ where: { id: templateId }, data: { active: !modele.active } });
  revalidatePath('/recurrences');
}

export async function supprimerRecurrenceAction(templateId: string) {
  const user = await requireUser();
  await prisma.recurringTemplate.deleteMany({ where: { id: templateId, userId: user.id } });
  revalidatePath('/recurrences');
}

export async function genererMaintenantAction() {
  await requireUser();
  const nombre = await genererFacturesRecurrentesDues();
  revalidatePath('/factures');
  revalidatePath('/recurrences');
  redirect(`/factures?erreur=${encodeURIComponent(`${nombre} facture(s) générée(s) en brouillon.`)}`);
}
