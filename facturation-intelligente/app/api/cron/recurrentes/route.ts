import { NextResponse } from 'next/server';
import { genererFacturesRecurrentesDues } from '@/lib/recurring';

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const creees = await genererFacturesRecurrentesDues();
  return NextResponse.json({ facturesCreees: creees });
}
