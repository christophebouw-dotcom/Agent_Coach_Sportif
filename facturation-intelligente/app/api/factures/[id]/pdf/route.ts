import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { genererPdfFacture } from '@/lib/pdf';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const facture = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { client: true, items: { orderBy: { position: 'asc' } } },
  });

  if (!facture) {
    return NextResponse.json({ error: 'Facture introuvable.' }, { status: 404 });
  }

  const pdf = await genererPdfFacture({ user, client: facture.client, invoice: facture });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${facture.number ?? 'brouillon'}.pdf"`,
    },
  });
}
