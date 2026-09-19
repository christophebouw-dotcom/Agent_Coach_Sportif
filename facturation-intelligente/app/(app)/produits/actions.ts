'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const schema = z.object({
  label: z.string().min(1, 'Le libellé est requis.'),
  description: z.string().default(''),
  unit: z.string().min(1).default('unité'),
  unitPriceHT: z.coerce.number().min(0, 'Le prix doit être positif.'),
  vatRate: z.coerce.number().min(0).max(100),
});

function lireFormData(formData: FormData) {
  return schema.parse({
    label: formData.get('label'),
    description: formData.get('description') ?? '',
    unit: formData.get('unit') || 'unité',
    unitPriceHT: formData.get('unitPriceHT'),
    vatRate: formData.get('vatRate'),
  });
}

export async function creerProduitAction(formData: FormData) {
  const user = await requireUser();
  const data = lireFormData(formData);

  await prisma.product.create({ data: { ...data, userId: user.id } });

  revalidatePath('/produits');
  redirect('/produits');
}

export async function modifierProduitAction(productId: string, formData: FormData) {
  const user = await requireUser();
  const data = lireFormData(formData);

  await prisma.product.updateMany({ where: { id: productId, userId: user.id }, data });

  revalidatePath('/produits');
  redirect('/produits');
}

export async function supprimerProduitAction(productId: string) {
  const user = await requireUser();
  await prisma.product.deleteMany({ where: { id: productId, userId: user.id } });
  revalidatePath('/produits');
}
