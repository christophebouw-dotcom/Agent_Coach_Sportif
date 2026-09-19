import { requireUser } from '@/lib/session';
import { ParametresForm } from '@/components/ParametresForm';
import { verifierIdentiteEmetteur } from '@/lib/legalMentions';

export default async function ParametresPage() {
  const user = await requireUser();
  const manquants = verifierIdentiteEmetteur(user);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">Paramètres de l'entreprise</h1>
      <p className="mb-6 text-sm text-slate-500">
        Ces informations apparaissent sur vos factures et doivent respecter la réglementation française sur la
        facturation (art. L441-9 et A441-1 du code de commerce).
      </p>

      {manquants.length > 0 ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="mb-1 font-medium">Informations manquantes avant de pouvoir émettre une facture :</p>
          <ul className="list-inside list-disc">
            {manquants.map((m) => (
              <li key={m.champ}>{m.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ParametresForm user={user} />
    </div>
  );
}
