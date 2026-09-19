import type { Client } from '@prisma/client';

export function ClientFormFields({ client }: { client?: Client }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Nom / raison sociale *</label>
        <input name="name" required defaultValue={client?.name} className="input" />
      </div>

      <div className="flex items-center gap-2 sm:col-span-2">
        <input
          id="isCompany"
          name="isCompany"
          type="checkbox"
          defaultChecked={client?.isCompany ?? true}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="isCompany" className="text-sm text-slate-700">
          Client professionnel (entreprise)
        </label>
      </div>

      <div>
        <label className="label">Email</label>
        <input name="email" type="email" defaultValue={client?.email} className="input" />
      </div>
      <div>
        <label className="label">Téléphone</label>
        <input name="phone" defaultValue={client?.phone} className="input" />
      </div>

      <div>
        <label className="label">SIRET</label>
        <input name="siret" defaultValue={client?.siret} className="input" />
      </div>
      <div>
        <label className="label">N° TVA intracommunautaire</label>
        <input name="vatNumber" defaultValue={client?.vatNumber} className="input" />
      </div>

      <div className="sm:col-span-2">
        <label className="label">Adresse</label>
        <input name="addressLine1" defaultValue={client?.addressLine1} className="input mb-2" placeholder="Ligne 1" />
        <input name="addressLine2" defaultValue={client?.addressLine2} className="input" placeholder="Ligne 2 (optionnel)" />
      </div>

      <div>
        <label className="label">Code postal</label>
        <input name="postalCode" defaultValue={client?.postalCode} className="input" />
      </div>
      <div>
        <label className="label">Ville</label>
        <input name="city" defaultValue={client?.city} className="input" />
      </div>
      <div>
        <label className="label">Pays</label>
        <input name="country" defaultValue={client?.country || 'France'} className="input" />
      </div>

      <div className="sm:col-span-2">
        <label className="label">Notes internes</label>
        <textarea name="notes" defaultValue={client?.notes} rows={3} className="input" />
      </div>
    </div>
  );
}
