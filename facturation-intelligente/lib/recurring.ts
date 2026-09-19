import { addDays, addMonths, addWeeks, addYears } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { calculerLigne, calculerTotauxFacture, type FactureLigneInput } from '@/lib/calculations';
import type { RecurrenceFrequency } from '@/lib/constants';

function prochaineDate(date: Date, frequency: RecurrenceFrequency): Date {
  switch (frequency) {
    case 'WEEKLY':
      return addWeeks(date, 1);
    case 'MONTHLY':
      return addMonths(date, 1);
    case 'QUARTERLY':
      return addMonths(date, 3);
    case 'YEARLY':
      return addYears(date, 1);
  }
}

/**
 * Génère les factures (en brouillon) pour tous les modèles récurrents
 * arrivés à échéance. Retourne le nombre de factures créées.
 *
 * Volontairement en DRAFT : la numérotation légale n'est attribuée qu'à
 * l'émission, pour ne jamais consommer de numéro sur une facture qui serait
 * finalement corrigée ou annulée avant envoi.
 */
export async function genererFacturesRecurrentesDues(now: Date = new Date()): Promise<number> {
  const modeles = await prisma.recurringTemplate.findMany({
    where: { active: true, nextRunDate: { lte: now } },
    include: { user: true, client: true },
  });

  let creees = 0;

  for (const modele of modeles) {
    const lignes = JSON.parse(modele.itemsJson) as FactureLigneInput[];
    const paymentTermsDays = modele.paymentTermsDays ?? modele.user.paymentTermsDays;
    const totaux = calculerTotauxFacture(lignes, modele.user.vatExempt);

    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          userId: modele.userId,
          clientId: modele.clientId,
          status: 'DRAFT',
          issueDate: now,
          serviceDate: now,
          dueDate: addDays(now, paymentTermsDays),
          subtotalHT: totaux.subtotalHT,
          vatTotal: totaux.vatTotal,
          totalTTC: totaux.totalTTC,
          vatExempt: modele.user.vatExempt,
          latePenaltyRate: modele.user.latePenaltyRate,
          recoveryIndemnity: modele.user.recoveryIndemnity,
          recurringTemplateId: modele.id,
          notes: `Générée automatiquement depuis le modèle récurrent « ${modele.label} ».`,
        },
      });

      await tx.invoiceItem.createMany({
        data: lignes.map((ligne, position) => ({
          invoiceId: invoice.id,
          position,
          description: ligne.description,
          quantity: ligne.quantity,
          unitPriceHT: ligne.unitPriceHT,
          vatRate: ligne.vatRate,
          totalHT: calculerLigne(ligne).totalHT,
        })),
      });

      await tx.recurringTemplate.update({
        where: { id: modele.id },
        data: {
          nextRunDate: prochaineDate(modele.nextRunDate, modele.frequency as RecurrenceFrequency),
          lastRunAt: now,
        },
      });
    });

    creees += 1;
  }

  return creees;
}
