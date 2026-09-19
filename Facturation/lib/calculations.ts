export type FactureLigneInput = {
  description: string;
  quantity: number;
  unitPriceHT: number;
  vatRate: number;
};

export type FactureTotaux = {
  subtotalHT: number;
  vatTotal: number;
  totalTTC: number;
  parTauxTVA: { vatRate: number; baseHT: number; montantTVA: number }[];
};

/** Arrondi bancaire à 2 décimales, pour éviter les erreurs de flottants sur les montants. */
export function arrondi(valeur: number): number {
  return Math.round((valeur + Number.EPSILON) * 100) / 100;
}

export function calculerLigne(ligne: FactureLigneInput) {
  const totalHT = arrondi(ligne.quantity * ligne.unitPriceHT);
  const montantTVA = arrondi(totalHT * (ligne.vatRate / 100));
  return { totalHT, montantTVA, totalTTC: arrondi(totalHT + montantTVA) };
}

export function calculerTotauxFacture(lignes: FactureLigneInput[], vatExempt: boolean): FactureTotaux {
  const parTauxMap = new Map<number, { baseHT: number; montantTVA: number }>();
  let subtotalHT = 0;
  let vatTotal = 0;

  for (const ligne of lignes) {
    const { totalHT, montantTVA } = calculerLigne(ligne);
    subtotalHT = arrondi(subtotalHT + totalHT);

    const tauxEffectif = vatExempt ? 0 : ligne.vatRate;
    const montantTVAEffectif = vatExempt ? 0 : montantTVA;
    vatTotal = arrondi(vatTotal + montantTVAEffectif);

    const courant = parTauxMap.get(tauxEffectif) ?? { baseHT: 0, montantTVA: 0 };
    courant.baseHT = arrondi(courant.baseHT + totalHT);
    courant.montantTVA = arrondi(courant.montantTVA + montantTVAEffectif);
    parTauxMap.set(tauxEffectif, courant);
  }

  const parTauxTVA = Array.from(parTauxMap.entries())
    .map(([vatRate, v]) => ({ vatRate, baseHT: v.baseHT, montantTVA: v.montantTVA }))
    .sort((a, b) => a.vatRate - b.vatRate);

  return {
    subtotalHT,
    vatTotal,
    totalTTC: arrondi(subtotalHT + vatTotal),
    parTauxTVA,
  };
}

export function formaterMontant(valeur: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(valeur);
}
