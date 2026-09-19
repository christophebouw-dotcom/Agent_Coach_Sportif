import { addDays, differenceInCalendarDays, format, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { prisma } from '@/lib/prisma';
import { arrondi } from '@/lib/calculations';

const STATUTS_FACTURES_EMISES = ['SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] as const;
const STATUTS_IMPAYES = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] as const;

export type PointCA = { mois: string; label: string; montantTTC: number };
export type TrancheEcheance = { label: string; montant: number };
export type Anomalie = { factureId: string; numero: string | null; client: string; message: string };

export async function caParMois(userId: string, nbMois = 12): Promise<PointCA[]> {
  const depuis = startOfMonth(subMonths(new Date(), nbMois - 1));

  const factures = await prisma.invoice.findMany({
    where: { userId, status: { in: [...STATUTS_FACTURES_EMISES] }, issueDate: { gte: depuis } },
    select: { issueDate: true, totalTTC: true },
  });

  const parMois = new Map<string, number>();
  for (let i = 0; i < nbMois; i++) {
    const d = startOfMonth(subMonths(new Date(), nbMois - 1 - i));
    parMois.set(format(d, 'yyyy-MM'), 0);
  }

  for (const f of factures) {
    const cle = format(startOfMonth(f.issueDate), 'yyyy-MM');
    if (parMois.has(cle)) {
      parMois.set(cle, arrondi((parMois.get(cle) ?? 0) + f.totalTTC));
    }
  }

  return Array.from(parMois.entries()).map(([mois, montantTTC]) => ({
    mois,
    label: format(new Date(`${mois}-01T00:00:00`), 'MMM yyyy', { locale: fr }),
    montantTTC,
  }));
}

export async function indicateursTresorerie(userId: string) {
  const impayees = await prisma.invoice.findMany({
    where: { userId, status: { in: [...STATUTS_IMPAYES] } },
    select: { totalTTC: true, amountPaid: true, dueDate: true },
  });

  let encoursTotal = 0;
  let enRetardTotal = 0;
  const now = new Date();

  for (const f of impayees) {
    const solde = f.totalTTC - f.amountPaid;
    encoursTotal = arrondi(encoursTotal + solde);
    if (f.dueDate < now) enRetardTotal = arrondi(enRetardTotal + solde);
  }

  return { encoursTotal, enRetardTotal, nombreImpayees: impayees.length };
}

/** Prévision de trésorerie : encours réparti par tranche d'échéance à venir (ou déjà en retard). */
export async function previsionTresorerie(userId: string): Promise<TrancheEcheance[]> {
  const impayees = await prisma.invoice.findMany({
    where: { userId, status: { in: [...STATUTS_IMPAYES] } },
    select: { totalTTC: true, amountPaid: true, dueDate: true },
  });

  const now = new Date();
  const tranches = {
    'En retard': 0,
    '0-7 jours': 0,
    '8-30 jours': 0,
    '31-60 jours': 0,
    '61-90 jours': 0,
    '+90 jours': 0,
  };

  for (const f of impayees) {
    const solde = f.totalTTC - f.amountPaid;
    const jours = differenceInCalendarDays(f.dueDate, now);

    let cle: keyof typeof tranches;
    if (jours < 0) cle = 'En retard';
    else if (jours <= 7) cle = '0-7 jours';
    else if (jours <= 30) cle = '8-30 jours';
    else if (jours <= 60) cle = '31-60 jours';
    else if (jours <= 90) cle = '61-90 jours';
    else cle = '+90 jours';

    tranches[cle] = arrondi(tranches[cle] + solde);
  }

  return Object.entries(tranches).map(([label, montant]) => ({ label, montant }));
}

/**
 * Détection d'anomalies simple : signale les factures récentes (30 derniers
 * jours) dont le montant s'écarte fortement (>60%) de la moyenne historique
 * du même client — utile pour repérer une erreur de saisie avant l'envoi.
 */
export async function detecterAnomalies(userId: string): Promise<Anomalie[]> {
  const clients = await prisma.client.findMany({
    where: { userId },
    include: {
      invoices: {
        where: { status: { not: 'CANCELLED' } },
        select: { id: true, number: true, totalTTC: true, createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const anomalies: Anomalie[] = [];
  const seuilRecent = addDays(new Date(), -30);

  for (const client of clients) {
    if (client.invoices.length < 3) continue; // pas assez d'historique pour être fiable

    const historique = client.invoices.filter((f) => f.createdAt < seuilRecent);
    if (historique.length < 2) continue;

    const moyenne = historique.reduce((s, f) => s + f.totalTTC, 0) / historique.length;
    if (moyenne <= 0) continue;

    const recentes = client.invoices.filter((f) => f.createdAt >= seuilRecent && f.status === 'DRAFT');
    for (const f of recentes) {
      const ecart = Math.abs(f.totalTTC - moyenne) / moyenne;
      if (ecart > 0.6) {
        const sens = f.totalTTC > moyenne ? 'supérieur' : 'inférieur';
        anomalies.push({
          factureId: f.id,
          numero: f.number,
          client: client.name,
          message: `Montant ${sens} de ${Math.round(ecart * 100)}% à la moyenne habituelle de ce client (${Math.round(moyenne)} €).`,
        });
      }
    }
  }

  return anomalies;
}
