import { differenceInCalendarDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { formaterMontant } from '@/lib/calculations';
import { envoyerEmail } from '@/lib/mailer';

const SEUILS_NIVEAUX = [
  { level: 1, minJoursRetard: 3, label: 'relance amicale' },
  { level: 2, minJoursRetard: 15, label: 'relance formelle' },
  { level: 3, minJoursRetard: 30, label: 'mise en demeure' },
] as const;

function niveauCible(joursRetard: number): number {
  let niveau = 0;
  for (const seuil of SEUILS_NIVEAUX) {
    if (joursRetard >= seuil.minJoursRetard) niveau = seuil.level;
  }
  return niveau;
}

function texteRelance(opts: {
  niveau: number;
  clientNom: string;
  factureNumero: string;
  solde: number;
  joursRetard: number;
  tauxPenalite: number;
  indemnite: number;
  emetteur: string;
}) {
  const { niveau, clientNom, factureNumero, solde, joursRetard, tauxPenalite, indemnite, emetteur } = opts;

  if (niveau === 1) {
    return {
      subject: `Rappel — facture ${factureNumero} en attente de règlement`,
      text: `Bonjour ${clientNom},\n\nSauf erreur de notre part, la facture ${factureNumero} d'un montant de ${formaterMontant(solde)} est arrivée à échéance depuis ${joursRetard} jours.\n\nMerci de bien vouloir procéder au règlement dans les meilleurs délais, ou de nous signaler tout empêchement.\n\nCordialement,\n${emetteur}`,
    };
  }
  if (niveau === 2) {
    return {
      subject: `Relance — facture ${factureNumero} impayée depuis ${joursRetard} jours`,
      text: `Bonjour ${clientNom},\n\nMalgré notre précédent rappel, la facture ${factureNumero} d'un montant de ${formaterMontant(solde)} demeure impayée à ce jour (${joursRetard} jours de retard).\n\nNous vous rappelons qu'en cas de retard de paiement, une pénalité au taux annuel de ${tauxPenalite}% ainsi qu'une indemnité forfaitaire de recouvrement de ${indemnite.toFixed(2)} € sont légalement dues (art. L441-10 du code de commerce).\n\nMerci de régulariser cette facture sous 15 jours.\n\nCordialement,\n${emetteur}`,
    };
  }
  return {
    subject: `Mise en demeure — facture ${factureNumero}`,
    text: `Bonjour ${clientNom},\n\nSans nouvelles de votre part, nous vous mettons en demeure de régler la facture ${factureNumero} d'un montant de ${formaterMontant(solde)}, échue depuis ${joursRetard} jours.\n\nÀ défaut de règlement sous 8 jours, les pénalités de retard (taux annuel de ${tauxPenalite}%) et l'indemnité forfaitaire de recouvrement de ${indemnite.toFixed(2)} € seront appliquées, et nous nous réservons le droit d'engager toute action utile au recouvrement de cette créance.\n\nCordialement,\n${emetteur}`,
  };
}

/**
 * Parcourt les factures envoyées et non soldées, détecte celles en retard,
 * passe leur statut à OVERDUE, et envoie la relance du niveau approprié
 * si elle n'a pas déjà été envoyée. Retourne le nombre de relances envoyées.
 */
export async function traiterRelancesImpayes(now: Date = new Date()): Promise<number> {
  const factures = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
      dueDate: { lt: now },
    },
    include: { client: true, user: true, reminders: true },
  });

  let envoyees = 0;

  for (const facture of factures) {
    const solde = facture.totalTTC - facture.amountPaid;
    if (solde <= 0) continue;

    const joursRetard = differenceInCalendarDays(now, facture.dueDate);
    const cible = niveauCible(joursRetard);

    if (facture.status !== 'OVERDUE') {
      await prisma.invoice.update({ where: { id: facture.id }, data: { status: 'OVERDUE' } });
    }

    if (cible === 0) continue;

    const dejaEnvoye = facture.reminders.some((r) => r.level === cible);
    if (dejaEnvoye) continue;
    if (!facture.client.email) continue; // pas d'adresse, on ne peut pas relancer par email

    const { subject, text } = texteRelance({
      niveau: cible,
      clientNom: facture.client.name,
      factureNumero: facture.number ?? facture.id,
      solde,
      joursRetard,
      tauxPenalite: facture.latePenaltyRate,
      indemnite: facture.recoveryIndemnity,
      emetteur: facture.user.companyName || facture.user.name,
    });

    await envoyerEmail({ to: facture.client.email, subject, text });

    await prisma.reminder.create({
      data: {
        invoiceId: facture.id,
        level: cible,
        channel: 'email',
        messagePreview: subject,
      },
    });

    envoyees += 1;
  }

  return envoyees;
}
