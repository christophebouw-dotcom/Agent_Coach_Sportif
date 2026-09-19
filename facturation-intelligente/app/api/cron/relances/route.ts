import { NextResponse } from 'next/server';
import { traiterRelancesImpayes } from '@/lib/reminders';

/**
 * Endpoint destiné à être appelé par une tâche planifiée externe (cron
 * système, GitHub Actions, Vercel Cron...) une fois par jour.
 * Protégé par un secret partagé, pas par la session utilisateur.
 */
export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const envoyees = await traiterRelancesImpayes();
  return NextResponse.json({ relancesEnvoyees: envoyees });
}
