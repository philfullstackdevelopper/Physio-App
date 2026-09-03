# EasyPhysio

Suivi de rééducation entre kinésithérapeutes et leurs patients : programmes d'exercices sur mesure, séances guidées en vidéo, suivi d'assiduité et retours de douleur en continu.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4**, icônes [lucide-react](https://lucide.dev)
- **Supabase** (Postgres + Auth + Storage) via `@supabase/ssr`
- **NextAuth v5 (beta)** pour la session praticien
- **Stripe** (Connect + facturation patient)

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs Supabase / Stripe
npm run dev                  # http://localhost:3000
```

Variables d'environnement : voir `.env.example` (Supabase, Stripe clés test, emails admin, URL publique du site).

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint |
| `node scripts/migrate.mjs` | Applique les migrations SQL de `supabase/migrations/` |

## Structure

```
app/
  page.tsx                 Landing publique
  praticiens/              Page dédiée aux kinésithérapeutes
  login/ signup/           Accès patient & inscription praticien
  dashboard/               Espace praticien (patients, séances, exercices, facturation)
  patient/                 Espace patient (programme, séance guidée, compte)
  cgu/ confidentialite/    Pages légales
  api/                     Route handlers (auth, Stripe webhook…)
components/                Composants UI (landing, mockups, sections)
lib/                       Clients Supabase/Stripe, helpers, config site
supabase/migrations/       Schéma SQL versionné
```

## Base de données

Le schéma vit dans `supabase/migrations` (numérotés, appliqués dans l'ordre via `scripts/migrate.mjs`). Toute modification de schéma passe par une nouvelle migration — ne jamais éditer une migration déjà appliquée.

## Points d'attention

- **Next.js 16** : conventions récentes (`proxy.ts` remplace `middleware.ts`). En cas de doute, consulter la doc embarquée dans `node_modules/next/dist/docs/`.
- Santé/RGPD : pas d'analytics tiers ; cookies essentiels uniquement (cf. `components/CookieBanner.tsx`).
- Les inscriptions praticiens passent par une approbation admin (`ADMIN_EMAILS`).
