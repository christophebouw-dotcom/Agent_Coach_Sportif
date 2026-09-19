'use server';

import { z } from 'zod';
import { addDays } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { calculerLigne, calculerTotauxFacture, formaterMontant } from '@/lib/calculations';
import { attribuerNumeroFacture } from '@/lib/invoiceNumber';
import { verifierIdentiteEmetteur } from '@/lib/legalMentions';
import { genererPdfFacture } from '@/lib/pdf';
import { envoyerEmail } from '@/lib/mailer';

const ligneSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPriceHT: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100),
});

const creationSchema = z.object({
  clientId: z.string().min(1, 'Sélectionnez un client.'),
  serviceDate: z.string().min(1),
  paymentTermsDays: z.coerce.number().int().positive(),
  notes: z.string().default(''),
  items: z.array(ligneSchema).min(1, 'Ajoutez au moins une ligne.'),
});

export type FactureFormState = { error?: string };

export async function creerFactureAction(_prevState: FactureFormState, formData: FormData): Promise<FactureFormState> {
  const user = await requireUser();

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get('itemsJson') ?? '[]'));
  } catch {
    return { error: 'Lignes de facture invalides.' };
  }

  const parsed = creationSchema.safeParse({
    clientId: formData.get('clientId'),
    serviceDate: formData.get('serviceDate'),
    paymentTermsDays: formData.get('paymentTermsDays') || user.paymentTermsDays,
    notes: formData.get('notes') ?? '',
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  }

  const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, userId: user.id } });
  if (!client) return { error: 'Client introuvable.' };

  const serviceDate = new Date(parsed.data.serviceDate);
  const totaux = calculerTotauxFacture(parsed.data.items, user.vatExempt);

  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: client.id,
      status: 'DRAFT',
      issueDate: new Date(),
      serviceDate,
      dueDate: addDays(serviceDate, parsed.data.paymentTermsDays),
      subtotalHT: totaux.subtotalHT,
      vatTotal: totaux.vatTotal,
      totalTTC: totaux.totalTTC,
      vatExempt: user.vatExempt,
      latePenaltyRate: user.latePenaltyRate,
      recoveryIndemnity: user.recoveryIndemnity,
      notes: parsed.data.notes,
      items: {
        create: parsed.data.items.map((ligne, position) => ({
          position,
          description: ligne.description,
          quantity: ligne.quantity,
          unitPriceHT: ligne.unitPriceHT,
          vatRate: ligne.vatRate,
          totalHT: calculerLigne(ligne).totalHT,
        })),
      },
    },
  });

  revalidatePath('/factures');
  redirect(`/factures/${invoice.id}`);
}

/**
 * Fait passer une facture de DRAFT à SENT : attribue le numéro légal
 * (opération atomique, jamais ré-attribuée ensuite), génère le PDF et
 * l'envoie par email au client si une adresse est renseignée.
 */
export async function emettreFactureAction(invoiceId: string) {
  const user = await requireUser();

  const facture = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId: user.id, status: 'DRAFT' },
    include: { client: true },
  });
  if (!facture) redirect('/factures?erreur=' + encodeURIComponent('Facture introuvable ou déjà émise.'));

  const manquants = verifierIdentiteEmetteur(user);
  if (manquants.length > 0) {
    redirect(`/factures/${invoiceId}?erreur=` + encodeURIComponent('Complétez vos informations légales (Paramètres) avant d\'émettre une facture : ' + manquants.map((m) => m.message).join(' ')));
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const { number, sequenceNumber } = await attribuerNumeroFacture(tx, user.id);
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { number, sequenceNumber, status: 'SENT', issueDate: now, sentAt: now },
    });
  });

  const factureComplete = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { items: true, client: true },
  });

  if (factureComplete.client.email) {
    const pdf = await genererPdfFacture({ user, client: factureComplete.client, invoice: factureComplete });
    await envoyerEmail({
      to: factureComplete.client.email,
      subject: `Facture ${factureComplete.number} — ${user.companyName || user.name}`,
      text: `Bonjour ${factureComplete.client.name},\n\nVeuillez trouver ci-joint la facture ${factureComplete.number} d'un montant de ${formaterMontant(factureComplete.totalTTC)}, à régler avant le ${new Intl.DateTimeFormat('fr-FR').format(factureComplete.dueDate)}.\n\nCordialement,\n${user.companyName || user.name}`,
      attachments: [{ filename: `${factureComplete.number}.pdf`, content: pdf }],
    });
  }

  revalidatePath('/factures');
  revalidatePath(`/factures/${invoiceId}`);
  redirect(`/factures/${invoiceId}`);
}

const paiementSchema = z.object({
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
  method: z.string().min(1),
  notes: z.string().default(''),
});

export async function enregistrerPaiementAction(invoiceId: string, formData: FormData) {
  const user = await requireUser();
  const facture = await prisma.invoice.findFirst({ where: { id: invoiceId, userId: user.id } });
  if (!facture) redirect('/factures');

  const parsed = paiementSchema.safeParse({
    amount: formData.get('amount'),
    date: formData.get('date'),
    method: formData.get('method'),
    notes: formData.get('notes') ?? '',
  });
  if (!parsed.success) {
    redirect(`/factures/${invoiceId}?erreur=` + encodeURIComponent('Paiement invalide.'));
  }

  await prisma.payment.create({
    data: {
      invoiceId,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      method: parsed.data.method,
      notes: parsed.data.notes,
    },
  });

  const totalPaye = await prisma.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
  const amountPaid = totalPaye._sum.amount ?? 0;
  const soldé = amountPaid >= facture.totalTTC;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid,
      status: soldé ? 'PAID' : 'PARTIALLY_PAID',
      paidAt: soldé ? new Date() : null,
    },
  });

  revalidatePath('/factures');
  revalidatePath(`/factures/${invoiceId}`);
  redirect(`/factures/${invoiceId}`);
}

export async function supprimerFactureAction(invoiceId: string) {
  const user = await requireUser();
  await prisma.invoice.deleteMany({ where: { id: invoiceId, userId: user.id, status: 'DRAFT' } });
  revalidatePath('/factures');
  redirect('/factures');
}
