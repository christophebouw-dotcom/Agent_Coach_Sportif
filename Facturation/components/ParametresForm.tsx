'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { User } from '@prisma/client';
import { mettreAJourParametresAction, type ParametresState } from '@/app/(app)/parametres/actions';

const initialState: ParametresState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? 'Enregistrement…' : 'Enregistrer'}
    </button>
  );
}

export function ParametresForm({ user }: { user: User }) {
  const [state, formAction] = useFormState(mettreAJourParametresAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold text-slate-700">Identité</h2>
        <div>
          <label className="label">Votre nom</label>
          <input name="name" required defaultValue={user.name} className="input" />
        </div>
        <div>
          <label className="label">Nom / raison sociale *</label>
          <input name="companyName" required defaultValue={user.companyName} className="input" />
        </div>
        <div>
          <label className="label">Forme juridique</label>
          <input name="legalForm" defaultValue={user.legalForm} className="input" placeholder="EI, auto-entrepreneur, SASU..." />
        </div>
        <div>
          <label className="label">SIRET *</label>
          <input name="siret" defaultValue={user.siret} className="input" />
        </div>
        <div>
          <label className="label">Ville RCS/RM (si société)</label>
          <input name="rcsCity" defaultValue={user.rcsCity} className="input" />
        </div>
        <div>
          <label className="label">Capital social (si société)</label>
          <input name="shareCapital" defaultValue={user.shareCapital} className="input" />
        </div>
      </div>

      <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold text-slate-700">TVA</h2>
        <div className="flex items-center gap-2">
          <input id="vatExempt" name="vatExempt" type="checkbox" defaultChecked={user.vatExempt} className="h-4 w-4 rounded border-slate-300" />
          <label htmlFor="vatExempt" className="text-sm text-slate-700">
            Franchise en base de TVA (micro-entrepreneur, art. 293 B du CGI)
          </label>
        </div>
        <div>
          <label className="label">N° TVA intracommunautaire</label>
          <input name="vatNumber" defaultValue={user.vatNumber} className="input" />
        </div>
      </div>

      <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold text-slate-700">Adresse</h2>
        <div className="sm:col-span-2">
          <input name="addressLine1" defaultValue={user.addressLine1} className="input mb-2" placeholder="Ligne 1 *" required />
          <input name="addressLine2" defaultValue={user.addressLine2} className="input" placeholder="Ligne 2 (optionnel)" />
        </div>
        <div>
          <label className="label">Code postal *</label>
          <input name="postalCode" required defaultValue={user.postalCode} className="input" />
        </div>
        <div>
          <label className="label">Ville *</label>
          <input name="city" required defaultValue={user.city} className="input" />
        </div>
        <div>
          <label className="label">Pays</label>
          <input name="country" defaultValue={user.country} className="input" />
        </div>
      </div>

      <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold text-slate-700">Coordonnées bancaires</h2>
        <div>
          <label className="label">IBAN</label>
          <input name="iban" defaultValue={user.iban} className="input" />
        </div>
        <div>
          <label className="label">BIC</label>
          <input name="bic" defaultValue={user.bic} className="input" />
        </div>
      </div>

      <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold text-slate-700">Politique de facturation</h2>
        <div>
          <label className="label">Préfixe de numérotation</label>
          <input name="invoicePrefix" defaultValue={user.invoicePrefix} className="input" />
        </div>
        <div>
          <label className="label">Délai de paiement par défaut (jours)</label>
          <input name="paymentTermsDays" type="number" min={1} defaultValue={user.paymentTermsDays} className="input" />
        </div>
        <div>
          <label className="label">Taux de pénalité de retard annuel (%)</label>
          <input name="latePenaltyRate" type="number" step="0.1" min={0} defaultValue={user.latePenaltyRate} className="input" />
        </div>
        <div>
          <label className="label">Indemnité forfaitaire de recouvrement (€)</label>
          <input name="recoveryIndemnity" type="number" step="0.01" min={0} defaultValue={user.recoveryIndemnity} className="input" />
        </div>
      </div>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">Paramètres enregistrés.</p> : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
