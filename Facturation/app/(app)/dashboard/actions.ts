'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/session';
import { traiterRelancesImpayes } from '@/lib/reminders';
import { genererFacturesRecurrentesDues } from '@/lib/recurring';

export async function envoyerRelancesMaintenantAction() {
  await requireUser();
  await traiterRelancesImpayes();
  revalidatePath('/dashboard');
  revalidatePath('/factures');
}

export async function genererRecurrentesMaintenantAction() {
  await requireUser();
  await genererFacturesRecurrentesDues();
  revalidatePath('/dashboard');
  revalidatePath('/factures');
}
