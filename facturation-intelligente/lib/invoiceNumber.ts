import { Prisma, PrismaClient } from '@prisma/client';

type TxClient = Prisma.TransactionClient | PrismaClient;

/**
 * Attribue le prochain numéro de facture pour l'utilisateur, de façon atomique.
 *
 * Contrainte légale (art. L441-9 / A441-1 code de commerce) : la numérotation
 * doit être chronologique et continue, sans trou ni doublon. On matérialise
 * ça par un compteur par année sur le compte utilisateur, incrémenté dans
 * la même transaction que la création de la facture.
 */
export async function attribuerNumeroFacture(
  tx: TxClient,
  userId: string,
): Promise<{ number: string; sequenceNumber: number }> {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const anneeCourante = new Date().getFullYear();

  const repart = user.invoiceSeqYear !== anneeCourante;
  const sequenceNumber = repart ? 1 : user.nextInvoiceSeq;

  await tx.user.update({
    where: { id: userId },
    data: {
      invoiceSeqYear: anneeCourante,
      nextInvoiceSeq: sequenceNumber + 1,
    },
  });

  const prefix = user.invoicePrefix?.trim() || 'FA';
  const number = `${prefix}-${anneeCourante}-${String(sequenceNumber).padStart(4, '0')}`;

  return { number, sequenceNumber };
}
