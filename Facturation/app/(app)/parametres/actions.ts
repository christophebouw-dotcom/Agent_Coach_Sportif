'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const schema = z.object({
  name: z.string().min(1),
  companyName: z.string().min(1, "Le nom de l'entreprise est requis."),
  legalForm: z.string().default(''),
  siret: z.string().default(''),
  rcsCity: z.string().default(''),
  shareCapital: z.string().default(''),
  vatNumber: z.string().default(''),
  vatExempt: z.coerce.boolean().default(false),
  addressLine1: z.string().default(''),
  addressLine2: z.string().default(''),
  postalCode: z.string().default(''),
  city: z.string().default(''),
  country: z.string().default('France'),
  iban: z.string().default(''),
  bic: z.string().default(''),
  invoicePrefix: z.string().min(1).default('FA'),
  paymentTermsDays: z.coerce.number().int().positive(),
  latePenaltyRate: z.coerce.number().min(0),
  recoveryIndemnity: z.coerce.number().min(0),
});

export type ParametresState = { error?: string; success?: boolean };

export async function mettreAJourParametresAction(_prevState: ParametresState, formData: FormData): Promise<ParametresState> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    name: formData.get('name'),
    companyName: formData.get('companyName'),
    legalForm: formData.get('legalForm') ?? '',
    siret: formData.get('siret') ?? '',
    rcsCity: formData.get('rcsCity') ?? '',
    shareCapital: formData.get('shareCapital') ?? '',
    vatNumber: formData.get('vatNumber') ?? '',
    vatExempt: formData.get('vatExempt') === 'on',
    addressLine1: formData.get('addressLine1') ?? '',
    addressLine2: formData.get('addressLine2') ?? '',
    postalCode: formData.get('postalCode') ?? '',
    city: formData.get('city') ?? '',
    country: formData.get('country') || 'France',
    iban: formData.get('iban') ?? '',
    bic: formData.get('bic') ?? '',
    invoicePrefix: formData.get('invoicePrefix') || 'FA',
    paymentTermsDays: formData.get('paymentTermsDays'),
    latePenaltyRate: formData.get('latePenaltyRate'),
    recoveryIndemnity: formData.get('recoveryIndemnity'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  }

  await prisma.user.update({ where: { id: user.id }, data: parsed.data });

  revalidatePath('/parametres');
  return { success: true };
}
