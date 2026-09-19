'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  isCompany: z.coerce.boolean().default(true),
  siret: z.string().default(''),
  vatNumber: z.string().default(''),
  email: z.string().email('Email invalide.').or(z.literal('')).default(''),
  phone: z.string().default(''),
  addressLine1: z.string().default(''),
  addressLine2: z.string().default(''),
  postalCode: z.string().default(''),
  city: z.string().default(''),
  country: z.string().default('France'),
  notes: z.string().default(''),
});

function lireFormData(formData: FormData) {
  return schema.parse({
    name: formData.get('name'),
    isCompany: formData.get('isCompany') === 'on',
    siret: formData.get('siret') ?? '',
    vatNumber: formData.get('vatNumber') ?? '',
    email: formData.get('email') ?? '',
    phone: formData.get('phone') ?? '',
    addressLine1: formData.get('addressLine1') ?? '',
    addressLine2: formData.get('addressLine2') ?? '',
    postalCode: formData.get('postalCode') ?? '',
    city: formData.get('city') ?? '',
    country: formData.get('country') || 'France',
    notes: formData.get('notes') ?? '',
  });
}

export async function creerClientAction(formData: FormData) {
  const user = await requireUser();
  const data = lireFormData(formData);

  await prisma.client.create({ data: { ...data, userId: user.id } });

  revalidatePath('/clients');
  redirect('/clients');
}

export async function modifierClientAction(clientId: string, formData: FormData) {
  const user = await requireUser();
  const data = lireFormData(formData);

  await prisma.client.updateMany({
    where: { id: clientId, userId: user.id },
    data,
  });

  revalidatePath('/clients');
  redirect('/clients');
}

export async function supprimerClientAction(clientId: string) {
  const user = await requireUser();

  const facturesLiees = await prisma.invoice.count({ where: { clientId, userId: user.id } });
  if (facturesLiees > 0) {
    redirect('/clients?erreur=' + encodeURIComponent('Impossible de supprimer un client ayant déjà des factures.'));
  }

  await prisma.client.deleteMany({ where: { id: clientId, userId: user.id } });
  revalidatePath('/clients');
  redirect('/clients');
}
