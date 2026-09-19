import type { Invoice, User } from '@prisma/client';

/**
 * Construit les mentions légales obligatoires d'une facture française
 * (articles L441-9 et A441-1 du code de commerce, art. 289 du CGI).
 *
 * Elles sont dérivées des valeurs figées sur la facture (pénalités, franchise
 * de TVA...) plutôt que des paramètres courants du compte, pour ne jamais
 * réécrire l'histoire d'une facture déjà émise.
 */
export function mentionsLegalesFacture(user: User, invoice: Pick<Invoice, 'vatExempt' | 'latePenaltyRate' | 'recoveryIndemnity'>): string[] {
  const mentions: string[] = [];

  if (invoice.vatExempt) {
    mentions.push('TVA non applicable, art. 293 B du CGI.');
  }

  mentions.push(
    `Pénalité de retard applicable en cas de paiement après l'échéance : taux annuel de ${invoice.latePenaltyRate}%.`,
  );
  mentions.push(
    `Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : ${invoice.recoveryIndemnity.toFixed(2)} € (art. L441-10 du code de commerce).`,
  );
  mentions.push('Pas d’escompte pour paiement anticipé.');

  if (user.legalForm && !isMicroEntrepreneur(user.legalForm)) {
    if (user.rcsCity) {
      mentions.push(`RCS ${user.rcsCity}${user.siret ? ` — SIRET ${user.siret}` : ''}.`);
    }
    if (user.shareCapital) {
      mentions.push(`Capital social : ${user.shareCapital}.`);
    }
  }

  return mentions;
}

function isMicroEntrepreneur(legalForm: string): boolean {
  return /micro|auto.?entrepreneur/i.test(legalForm);
}

export type ChampsLegauxManquants = { champ: string; message: string }[];

/**
 * Vérifie que l'émetteur a renseigné le minimum légal avant de pouvoir
 * émettre (et pas seulement brouillonner) une facture.
 */
export function verifierIdentiteEmetteur(user: User): ChampsLegauxManquants {
  const manquants: ChampsLegauxManquants = [];

  if (!user.companyName.trim()) manquants.push({ champ: 'companyName', message: "Le nom / raison sociale de l'entreprise est obligatoire." });
  if (!user.addressLine1.trim() || !user.postalCode.trim() || !user.city.trim()) {
    manquants.push({ champ: 'address', message: "L'adresse complète de l'émetteur est obligatoire." });
  }
  if (!user.siret.trim()) manquants.push({ champ: 'siret', message: 'Le SIRET est obligatoire pour émettre une facture en France.' });
  if (!user.vatExempt && !user.vatNumber.trim()) {
    manquants.push({ champ: 'vatNumber', message: "Le numéro de TVA intracommunautaire est requis (ou cochez la franchise en base si vous n'y êtes pas assujetti)." });
  }

  return manquants;
}
