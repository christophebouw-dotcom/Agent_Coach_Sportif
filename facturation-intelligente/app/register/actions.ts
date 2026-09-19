'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  companyName: z.string().min(1, "Le nom de l'entreprise est requis."),
  email: z.string().email('Email invalide.'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
});

export type RegisterState = { error?: string };

export async function registerAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = schema.safeParse({
    name: formData.get('name'),
    companyName: formData.get('companyName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    return { error: 'Un compte existe déjà avec cet email.' };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: parsed.data.name,
      companyName: parsed.data.companyName,
    },
  });

  redirect('/login?registered=1');
}
