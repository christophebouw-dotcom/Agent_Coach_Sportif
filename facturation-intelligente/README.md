# Facturation Intelligente

Application web de facturation pour indépendants et petites entreprises, avec
génération automatique de factures récurrentes, relances d'impayés
automatisées, conformité légale française et prévisions de trésorerie.

## Fonctionnalités « intelligentes »

- **Génération automatique de factures** : des modèles récurrents (mensuel,
  trimestriel...) créent automatiquement un brouillon de facture à échéance —
  il ne reste qu'à vérifier et cliquer sur « Émettre & envoyer ».
- **Relances de paiement automatisées** : détection des factures en retard et
  envoi d'emails de relance échelonnés (amicale → formelle → mise en
  demeure), avec mention des pénalités de retard légales.
- **Conformité légale française** : numérotation chronologique sans trou
  (attribuée uniquement à l'émission, jamais aux brouillons), mentions
  obligatoires (SIRET, TVA, pénalités de retard, indemnité forfaitaire de
  recouvrement, franchise en base...).
- **Tableau de bord & prévisions** : chiffre d'affaires par mois, encours,
  prévision de trésorerie par tranche d'échéance, détection d'anomalies
  (montant anormal par rapport à l'historique d'un client) sur les brouillons
  récents.

## Stack technique

Next.js 15 (App Router, TypeScript) · Prisma + SQLite · NextAuth (identifiants
email/mot de passe) · Tailwind CSS · @react-pdf/renderer · Nodemailer.

## Démarrage

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run seed   # crée un compte de démo
npm run dev
```

Compte de démonstration : `demo@exemple.fr` / `demo1234`.

## Génération du PDF de facture

Le rendu PDF (`scripts/render-invoice-pdf.tsx`) s'exécute dans un
**sous-processus Node séparé** (via `tsx`), et non dans le runtime de
Next.js. C'est nécessaire : Next.js compile tout le code de `app/` avec sa
propre copie interne de React (taguée `react.transitional.element`), alors
que `@react-pdf/renderer` attend des éléments créés par le React classique du
projet (`react.element`). Appeler `renderToBuffer` directement depuis une
route ou une Server Action plante avec l'erreur React #31 (« Objects are not
valid as a React child »). `lib/pdf.ts` lance donc le script comme processus
enfant et lui passe les données de la facture en JSON sur stdin ; le PDF
revient sur stdout.

## Tâches planifiées (cron)

En production, deux tâches doivent tourner régulièrement (ex. une fois par
jour) :

```bash
curl -X POST https://votre-domaine/api/cron/recurrentes -H "x-cron-secret: $CRON_SECRET"
curl -X POST https://votre-domaine/api/cron/relances -H "x-cron-secret: $CRON_SECRET"
```

En local ou sur un serveur avec accès au filesystem, on peut aussi utiliser
directement :

```bash
npm run cron:recurring
npm run cron:relances
```

`CRON_SECRET` (voir `.env.example`) protège ces endpoints — ils ne dépendent
pas d'une session utilisateur.

## Base de données

SQLite par défaut (zéro configuration). Pour la production, passer à
PostgreSQL : changer `provider` dans `prisma/schema.prisma` et `DATABASE_URL`
dans `.env`, puis `npx prisma migrate deploy`. Note : SQLite n'a pas d'enum
natif, `Invoice.status` et `RecurringTemplate.frequency` sont donc stockés en
`String` et validés côté application (`lib/constants.ts`) — ce choix reste
valable même après une migration vers Postgres.

## Limites connues / pistes d'évolution

- Pas de gestion des avoirs (factures d'annulation/correction) : une facture
  émise ne peut plus être annulée, seulement soldée par des paiements. C'est
  volontaire pour préserver l'intégrité de la numérotation légale, mais un
  vrai flux d'avoir serait nécessaire pour corriger une facture déjà envoyée.
- Une seule devise (EUR) et une seule langue (français).
- L'envoi d'email utilise Nodemailer avec un SMTP à configurer
  (`.env.example`) ; sans configuration, les emails sont simplement
  journalisés dans la console (pratique en développement).
- Le rapprochement bancaire automatique (import de relevés) n'est pas
  implémenté ; les paiements sont enregistrés manuellement.
