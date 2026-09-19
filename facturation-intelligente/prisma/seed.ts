import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@exemple.fr';
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: 'Compte de démonstration',
      companyName: 'Coach Pro SASU',
      legalForm: 'SASU',
      siret: '12345678900011',
      rcsCity: 'Bordeaux',
      shareCapital: '1 000 €',
      vatNumber: 'FR12345678900',
      addressLine1: '12 rue des Sports',
      postalCode: '33000',
      city: 'Bordeaux',
      country: 'France',
      iban: 'FR76 3000 4000 0100 0012 3456 789',
      bic: 'BNPAFRPPXXX',
      invoicePrefix: 'FA',
      paymentTermsDays: 30,
      latePenaltyRate: 10,
      recoveryIndemnity: 40,
    },
  });

  const client = await prisma.client.upsert({
    where: { id: 'seed-client-1' },
    update: {},
    create: {
      id: 'seed-client-1',
      userId: user.id,
      name: 'Club Sportif Exemple',
      isCompany: true,
      email: 'compta@club-exemple.fr',
      addressLine1: '4 avenue du Stade',
      postalCode: '33200',
      city: 'Bordeaux',
      country: 'France',
    },
  });

  await prisma.product.upsert({
    where: { id: 'seed-product-1' },
    update: {},
    create: {
      id: 'seed-product-1',
      userId: user.id,
      label: 'Séance de coaching individuel',
      unit: 'séance',
      unitPriceHT: 60,
      vatRate: 20,
    },
  });

  await prisma.product.upsert({
    where: { id: 'seed-product-2' },
    update: {},
    create: {
      id: 'seed-product-2',
      userId: user.id,
      label: 'Forfait mensuel — suivi personnalisé',
      unit: 'forfait',
      unitPriceHT: 350,
      vatRate: 20,
    },
  });

  console.log('Compte de démonstration prêt :');
  console.log(`  email : ${email}`);
  console.log('  mot de passe : demo1234');
  console.log(`  client exemple : ${client.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
