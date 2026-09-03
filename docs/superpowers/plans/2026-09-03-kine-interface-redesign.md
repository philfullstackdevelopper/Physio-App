# Refonte de l'interface kiné — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au côté kiné une seule identité visuelle (celle des maquettes du 2026-09-03), restructurer tableau de bord / liste des patients / fiche patient / bibliothèques, ajouter « Ajuster la séance » par patient, et remplacer la démo kiné de l'accueil par une simulation 3 panneaux.

**Architecture:** Un jeu de tokens Tailwind 4 (`@theme`) partagé par tout `/dashboard/*` ; trois modules purs testables (`relativeDay`, `computeAdherence`, `computeSignal`) consommés par le tableau de bord, la liste et la fiche pour que les trois vues ne se contredisent jamais ; une migration (`workouts.patient_id`) + une action serveur pour la copie personnelle d'une séance ; un composant client de démo sur l'accueil qui rejoue les vrais écrans.

**Tech Stack:** Next.js 16 (App Router, server components + server actions), React 19, Tailwind CSS 4, Supabase (Postgres + RLS), Clerk, lucide-react, `motion/react` (déjà installé), `node --test` (Node 24, tests `.test.ts` sans dépendance).

**Spec:** `docs/superpowers/specs/2026-09-03-kine-interface-redesign-design.md`

## Global Constraints

- Toute l'interface est en français ; jamais d'emoji comme icône ; icônes `lucide-react` uniquement, `strokeWidth={1.75}`.
- Vocabulaire : **patient**, jamais « client ».
- Palette côté kiné = uniquement les tokens de la Tâche 1 (`app-bg`, `surface`, `line`, `ink`, `muted`, `brand`, `brand-soft`, `sidebar`, `ok`, `ok-soft`, `warn`, `warn-soft`, `danger`, `danger-soft`). Interdit dans `/dashboard/*` et ses composants : classes `stone-*`, `slate-*`, variables `--ink*`, `--paper`, `--hairline`, `--grade-*`, classe `.rehab-panel`, classe `.grain`, `font-display`.
- Typographie app : Instrument Sans (défaut). `font-display` (Fraunces) reste réservée au site vitrine (`app/page.tsx`, `app/praticiens/`, header/footer du site).
- Formes : cartes `rounded-xl`, champs `rounded-lg`, badges/boutons `rounded-full`. Pas d'ombre au repos (`shadow-sm` uniquement sur les modales).
- Chiffres alignés : `tabular-nums` sur tuiles, tableau, stats.
- Motion : `fadeInUp` existant à l'arrivée des sections ; rien d'autre dans l'app. `prefers-reduced-motion` respecté (les `@media` de `globals.css` s'en chargent pour CSS ; les composants `motion/react` utilisent `useReducedMotion` de `components/PhoneDemoScreens.tsx`).
- Règles partagées : inactif = **7 jours** (`INACTIVE_DAYS`), douleur signalée = règle `assessSignals` existante (`PAIN_HOLD = 6`, 2 notes minimum sur 14 jours), adhérence = fenêtre **28 jours**, seuils 80 / 50.
- Ne pas toucher : côté patient (`app/patient/*`, `components/PatientNav.tsx`, `components/WorkoutSession.tsx`) sauf la Tâche 9 (message automatique inséré côté serveur), `app/dashboard/facturation/*`, `app/admin/*`, auth.
- Sécurité : toute nouvelle policy RLS est expliquée en clair dans le fichier de migration ; **Philippe applique la migration lui-même** (jamais l'agent).
- Avant chaque commit : `npx tsc --noEmit` et `npm run lint` passent ; `npm test` passe (script ajouté Tâche 2).
- Commits : message en français, suffixé des deux lignes d'attribution en vigueur dans la session (`Co-Authored-By` + `Claude-Session`).
- Ne jamais lire ni afficher `.env.local`.

## Carte des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `app/globals.css` | tokens `@theme`, suppression `.rehab-panel` | 1 |
| `lib/format/relativeDay.ts` (+ `.test.ts`) | « Aujourd'hui / Hier / Il y a N jours / Lun. 1 sept. » | 2 |
| `lib/format/initials.ts` (+ `.test.ts`) | « Marc T. » → « MT » | 2 |
| `lib/exercise/adherence.ts` (+ `.test.ts`) | % d'adhérence 28 jours + libellé + ton | 2 |
| `lib/dashboard/patientSignal.ts` (+ `.test.ts`) | signal douleur / inactif / à jour | 2 |
| `lib/exercise/prescription.ts` | ajout `STAGE_SHORT` | 2 |
| `package.json` | script `test` | 2 |
| `components/DashboardSidebar.tsx`, `app/dashboard/layout.tsx` | sidebar sombre, bloc utilisateur, fond `app-bg` | 3 |
| `lib/dashboard/patientRows.ts` (+ `.test.ts`) | lignes du tableau des patients (pur + chargement) | 4 |
| `components/PatientsTable.tsx`, `app/dashboard/patients/page.tsx`, `loading.tsx`, `new/page.tsx` | tableau, filtres, page | 5 |
| `lib/dashboard/homeData.ts` (+ `.test.ts`) | tuiles, à traiter, activité, bandeau | 6 |
| `app/dashboard/page.tsx` | rendu du tableau de bord | 7 |
| `supabase/migrations/0042_patient_workouts.sql` | `workouts.patient_id`, policies | 8 |
| `lib/exercise/adjustPlan.ts` (+ `.test.ts`), `app/dashboard/patients/[id]/actions.ts` | action `adjustPatientWorkout` | 9 |
| `components/AdjustWorkoutModal.tsx` | modale « Ajuster la séance » | 10 |
| `lib/dashboard/painHistory.ts` (+ `.test.ts`), `components/PainHistoryChart.tsx` | courbe douleur 30 jours | 11 |
| `components/PatientCalendar.tsx`, `components/AddWorkoutModal.tsx`, `app/dashboard/patients/[id]/page.tsx`, `app/dashboard/seances/page.tsx` | fiche patient, filtre `patient_id is null` | 12 |
| `components/KineJourneyDemo.tsx`, `app/page.tsx`, `components/KineDemoScreens.tsx` | démo 3 panneaux | 13 |
| `components/SeancesTabs.tsx`, `app/dashboard/seances/[id]/page.tsx`, `components/ExercisePicker.tsx` | restyle séances | 14 |
| `components/ExerciseLibraryGrid.tsx`, `components/ExerciseVideoUpload.tsx`, `components/DocumentUpload.tsx` | restyle exercices | 15 |
| `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md` | docs | 16 |
| — | smoke test navigateur | 17 |

Ordre : 1 → 2 → 3 (séquentiel), puis {4→5}, {6→7}, {8→9→10→11→12}, 13, {14, 15} en parallèle, puis 16 → 17.

---

### Task 1: Tokens de couleur et nettoyage de `globals.css`

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: classes Tailwind `bg-app-bg`, `bg-surface`, `border-line`, `text-ink`, `text-muted`, `bg-brand`, `text-brand`, `bg-brand-soft`, `bg-sidebar`, `text-ok`, `bg-ok-soft`, `text-warn`, `bg-warn-soft`, `text-danger`, `bg-danger-soft` (et leurs variantes `hover:`, `border-`, etc.).

- [ ] **Step 1: Remplacer le bloc `@theme inline` et retirer `.rehab-panel`**

Dans `app/globals.css`, remplacer les lignes 3–15 (`:root { … }` et `@theme inline { … }`) par :

```css
:root {
  --background: #f8fafb;
  --foreground: #0f172a;
  --brand: #155dfc; /* blue-600 */
  --brand-dark: #1447c9; /* blue-700 */
}

/* Palette de l'application kiné (/dashboard/*) — une seule, partagée.
   Le site vitrine garde ses classes slate ; ne pas mélanger. */
@theme {
  --color-app-bg: #f5f7fb;
  --color-surface: #ffffff;
  --color-line: #e5e9f0;
  --color-ink: #0f172a;
  --color-muted: #64748b;
  --color-brand: #155dfc;
  --color-brand-dark: #1447c9;
  --color-brand-soft: #eaf1ff;
  --color-sidebar: #0d1b3e;
  --color-ok: #16a34a;
  --color-ok-soft: #e8f7ee;
  --color-warn: #f59e0b;
  --color-warn-soft: #fff4e0;
  --color-danger: #dc2626;
  --color-danger-soft: #fdecec;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

Supprimer entièrement le bloc `.rehab-panel { … }` (lignes 33–51 du fichier actuel, commentaire compris). Laisser le reste (`.font-display`, keyframes, `.grain`, `.ei-frame-*`, reduced-motion) tel quel.

- [ ] **Step 2: Vérifier que rien d'autre ne référence `.rehab-panel` ni `--color-brand-dark` en double**

Run: `grep -rn "rehab-panel" app components lib --include=*.tsx --include=*.ts`
Expected: une seule occurrence, `app/dashboard/patients/[id]/page.tsx` (`<main className="rehab-panel …">`) — elle sera retirée en Tâche 12. Aucune autre.

- [ ] **Step 3: Lint + typecheck**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "Tokens de couleur de l'app kiné, suppression de la palette papier"
```

---

### Task 2: Modules partagés purs + script de test

**Files:**
- Create: `lib/format/relativeDay.ts`, `lib/format/relativeDay.test.ts`
- Create: `lib/format/initials.ts`, `lib/format/initials.test.ts`
- Create: `lib/exercise/adherence.ts`, `lib/exercise/adherence.test.ts`
- Create: `lib/dashboard/patientSignal.ts`, `lib/dashboard/patientSignal.test.ts`
- Modify: `lib/exercise/prescription.ts` (ajout `STAGE_SHORT`)
- Modify: `package.json` (script `test`)

**Interfaces:**
- Produces:
  - `relativeDay(iso: string | null | undefined, now?: Date): string`
  - `daysBetween(iso: string, now?: Date): number` (jours calendaires locaux)
  - `initials(name: string | null | undefined): string`
  - `computeAdherence(input: AdherenceInput): Adherence` avec `AdherenceInput = { completedAt: string[]; recommendations: { timesPerWeek: number | null; createdAt: string }[]; now?: Date }` et `Adherence = { pct: number | null; done: number; expected: number }`
  - `adherenceLabel(pct: number | null): "Bonne" | "Moyenne" | "Faible" | null`
  - `adherenceTone(pct: number | null): "ok" | "warn" | "danger" | "muted"`
  - `computeSignal(input: SignalInput): Signal` avec `SignalInput = { concerning: boolean; severe: boolean; lastPain: number | null; lastSessionAt: string | null; createdAt: string; now?: Date }` et `Signal = { kind: "pain" | "inactive" | "ok"; label: string; severe: boolean; score: number | null; days: number | null }`
  - `INACTIVE_DAYS = 7`
  - `STAGE_SHORT: Record<InjuryStage, string>` = `{ acute: "Phase 1", subacute: "Phase 2", recovery: "Phase 3", return_to_sport: "Phase 4" }`

Note : ces modules n'importent **rien** via l'alias `@/` (imports relatifs uniquement) pour rester exécutables par `node --test` sans configuration.

- [ ] **Step 1: Ajouter le script de test**

Dans `package.json`, section `scripts`, ajouter :

```json
"test": "node --test \"lib/**/*.test.ts\""
```

- [ ] **Step 2: Écrire les tests de `relativeDay`**

`lib/format/relativeDay.test.ts` :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { relativeDay, daysBetween } from "./relativeDay.ts";

const now = new Date(2026, 8, 3, 15, 0); // mercredi 3 septembre 2026, 15h

test("aujourd'hui, même à minuit passé", () => {
  assert.equal(relativeDay(new Date(2026, 8, 3, 0, 5).toISOString(), now), "Aujourd'hui");
});

test("hier, même tard le soir", () => {
  assert.equal(relativeDay(new Date(2026, 8, 2, 23, 50).toISOString(), now), "Hier");
});

test("il y a N jours de 2 à 6", () => {
  assert.equal(relativeDay(new Date(2026, 8, 1).toISOString(), now), "Il y a 2 jours");
  assert.equal(relativeDay(new Date(2026, 7, 28).toISOString(), now), "Il y a 6 jours");
});

test("date courte au-delà de 6 jours", () => {
  assert.equal(relativeDay(new Date(2026, 7, 27).toISOString(), now), "Jeu. 27 août");
});

test("jamais quand null", () => {
  assert.equal(relativeDay(null, now), "Jamais");
  assert.equal(relativeDay(undefined, now), "Jamais");
});

test("daysBetween compte des jours calendaires locaux", () => {
  assert.equal(daysBetween(new Date(2026, 8, 3, 0, 1).toISOString(), now), 0);
  assert.equal(daysBetween(new Date(2026, 8, 2, 23, 59).toISOString(), now), 1);
  assert.equal(daysBetween(new Date(2026, 7, 27, 12).toISOString(), now), 7);
});
```

- [ ] **Step 3: Lancer, vérifier l'échec**

Run: `npm test`
Expected: échec « Cannot find module … relativeDay.ts ».

- [ ] **Step 4: Implémenter `relativeDay.ts`**

```ts
// Libellés relatifs partagés par le tableau de bord, le tableau des patients
// et la fiche patient — une seule façon de dire « quand ».

const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Jours calendaires (locaux) entre `iso` et `now`, positif si `iso` est passé. */
export function daysBetween(iso: string, now: Date = new Date()): number {
  const a = startOfLocalDay(new Date(iso)).getTime();
  const b = startOfLocalDay(now).getTime();
  return Math.round((b - a) / 86_400_000);
}

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

/** « Aujourd'hui », « Hier », « Il y a N jours » (2–6), sinon « Jeu. 27 août ». `null` → « Jamais ». */
export function relativeDay(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "Jamais";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Jamais";
  const days = daysBetween(iso, now);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days <= 6) return `Il y a ${days} jours`;
  const s = SHORT_DATE.format(d).replace(/\.?,?\s+/, ". ").replace(/\.$/, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

- [ ] **Step 5: Lancer, vérifier le succès**

Run: `npm test`
Expected: les 6 tests `relativeDay` passent. Si le format court diffère selon la locale ICU de Node (« jeu. 27 août » vs « jeu 27 août »), ajuster la regex du Step 4 jusqu'à obtenir exactement « Jeu. 27 août » — le test fait foi.

- [ ] **Step 6: `initials` — test puis implémentation**

`lib/format/initials.test.ts` :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { initials } from "./initials.ts";

test("deux mots → deux lettres", () => {
  assert.equal(initials("Marc T."), "MT");
  assert.equal(initials("Claire Dupont"), "CD");
});
test("un mot → deux premières lettres", () => {
  assert.equal(initials("Claire"), "CL");
});
test("vide → « ? »", () => {
  assert.equal(initials(""), "?");
  assert.equal(initials(null), "?");
});
```

`lib/format/initials.ts` :

```ts
/** « Marc T. » → « MT », « Claire » → « CL », vide → « ? ». */
export function initials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
```

Run: `npm test` → les 3 tests `initials` passent.

- [ ] **Step 7: `computeAdherence` — tests**

`lib/exercise/adherence.test.ts` :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeAdherence, adherenceLabel, adherenceTone } from "./adherence.ts";

const now = new Date(2026, 8, 3, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

test("sans recommandation → pct null", () => {
  const a = computeAdherence({ completedAt: [daysAgo(1)], recommendations: [], now });
  assert.deepEqual(a, { pct: null, done: 1, expected: 0 });
});

test("4 semaines à 3×/semaine, 10 séances faites → 83 %", () => {
  const a = computeAdherence({
    completedAt: Array.from({ length: 10 }, (_, i) => daysAgo(i * 2)),
    recommendations: [{ timesPerWeek: 3, createdAt: daysAgo(40) }],
    now,
  });
  assert.equal(a.expected, 12);
  assert.equal(a.done, 10);
  assert.equal(a.pct, 83);
});

test("recommandation récente : attendu proratisé, plafond 100 %", () => {
  const a = computeAdherence({
    completedAt: [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3)],
    recommendations: [{ timesPerWeek: 3, createdAt: daysAgo(5) }],
    now,
  });
  assert.equal(a.expected, 3); // ceil(5/7) = 1 semaine × 3
  assert.equal(a.pct, 100);
});

test("les séances hors fenêtre de 28 jours ne comptent pas", () => {
  const a = computeAdherence({
    completedAt: [daysAgo(29), daysAgo(40)],
    recommendations: [{ timesPerWeek: 2, createdAt: daysAgo(60) }],
    now,
  });
  assert.equal(a.done, 0);
  assert.equal(a.pct, 0);
});

test("timesPerWeek null compte pour 1", () => {
  const a = computeAdherence({
    completedAt: [],
    recommendations: [{ timesPerWeek: null, createdAt: daysAgo(30) }],
    now,
  });
  assert.equal(a.expected, 4);
});

test("libellés et tons", () => {
  assert.equal(adherenceLabel(82), "Bonne");
  assert.equal(adherenceLabel(50), "Moyenne");
  assert.equal(adherenceLabel(49), "Faible");
  assert.equal(adherenceLabel(null), null);
  assert.equal(adherenceTone(80), "ok");
  assert.equal(adherenceTone(79), "warn");
  assert.equal(adherenceTone(10), "danger");
  assert.equal(adherenceTone(null), "muted");
});
```

- [ ] **Step 8: `computeAdherence` — implémentation**

`lib/exercise/adherence.ts` :

```ts
// =============================================================================
// Adhérence sur 28 jours — partagée par le tableau des patients (colonne),
// la fiche patient (stat) et, indirectement, le tableau de bord. Une seule
// définition : séances faites ÷ séances attendues, attendues = Σ (fois/semaine
// × semaines écoulées depuis la recommandation, plafonnées à 4).
// =============================================================================

export const ADHERENCE_WINDOW_DAYS = 28;

export interface AdherenceInput {
  /** `workout_logs.completed_at` du patient (toutes dates ; le filtre est fait ici). */
  completedAt: string[];
  /** `patient_recommended_workouts` joints à `workouts.times_per_week`. */
  recommendations: { timesPerWeek: number | null; createdAt: string }[];
  now?: Date;
}

export interface Adherence {
  /** 0–100, ou null quand rien n'est attendu (aucune recommandation). */
  pct: number | null;
  done: number;
  expected: number;
}

export function computeAdherence({ completedAt, recommendations, now = new Date() }: AdherenceInput): Adherence {
  const windowStart = now.getTime() - ADHERENCE_WINDOW_DAYS * 86_400_000;
  const done = completedAt.filter((iso) => {
    const t = new Date(iso).getTime();
    return !Number.isNaN(t) && t >= windowStart && t <= now.getTime();
  }).length;

  let expected = 0;
  for (const r of recommendations) {
    const since = new Date(r.createdAt).getTime();
    const days = Number.isNaN(since) ? ADHERENCE_WINDOW_DAYS : Math.max(0, (now.getTime() - since) / 86_400_000);
    const weeks = Math.min(4, Math.ceil(days / 7));
    expected += (r.timesPerWeek ?? 1) * weeks;
  }

  const pct = expected === 0 ? null : Math.min(100, Math.round((done / expected) * 100));
  return { pct, done, expected };
}

export function adherenceLabel(pct: number | null): "Bonne" | "Moyenne" | "Faible" | null {
  if (pct === null) return null;
  if (pct >= 80) return "Bonne";
  if (pct >= 50) return "Moyenne";
  return "Faible";
}

export function adherenceTone(pct: number | null): "ok" | "warn" | "danger" | "muted" {
  if (pct === null) return "muted";
  if (pct >= 80) return "ok";
  if (pct >= 50) return "warn";
  return "danger";
}
```

Run: `npm test` → tous les tests `adherence` passent.

- [ ] **Step 9: `computeSignal` — tests**

`lib/dashboard/patientSignal.test.ts` :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSignal, INACTIVE_DAYS } from "./patientSignal.ts";

const now = new Date(2026, 8, 3, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
const base = { concerning: false, severe: false, lastPain: null, lastSessionAt: daysAgo(1), createdAt: daysAgo(30), now };

test("douleur prioritaire sur l'inactivité", () => {
  const s = computeSignal({ ...base, concerning: true, lastPain: 7, lastSessionAt: daysAgo(10) });
  assert.equal(s.kind, "pain");
  assert.equal(s.label, "Douleur signalée 7/10");
  assert.equal(s.score, 7);
});

test("inactif à partir de 7 jours", () => {
  const s = computeSignal({ ...base, lastSessionAt: daysAgo(INACTIVE_DAYS) });
  assert.equal(s.kind, "inactive");
  assert.equal(s.label, "Aucune séance depuis 7 jours");
  assert.equal(s.days, 7);
});

test("à jour sous 7 jours", () => {
  const s = computeSignal({ ...base, lastSessionAt: daysAgo(6) });
  assert.equal(s.kind, "ok");
  assert.equal(s.label, "À jour");
});

test("jamais de séance mais compte jeune → à jour (pas de bruit)", () => {
  const s = computeSignal({ ...base, lastSessionAt: null, createdAt: daysAgo(3) });
  assert.equal(s.kind, "ok");
});

test("jamais de séance et compte ancien → inactif depuis la création", () => {
  const s = computeSignal({ ...base, lastSessionAt: null, createdAt: daysAgo(12) });
  assert.equal(s.kind, "inactive");
  assert.equal(s.days, 12);
});

test("douleur sans dernière note connue → libellé sans score", () => {
  const s = computeSignal({ ...base, concerning: true, lastPain: null });
  assert.equal(s.label, "Douleur signalée");
  assert.equal(s.score, null);
});
```

- [ ] **Step 10: `computeSignal` — implémentation**

`lib/dashboard/patientSignal.ts` :

```ts
// =============================================================================
// Signal d'un patient — partagé par le tableau de bord (« À traiter
// aujourd'hui ») et le tableau des patients (colonne Signal). Une seule
// priorité : douleur > inactivité > à jour. Les deux vues ne peuvent pas se
// contredire parce qu'elles appellent cette fonction.
// =============================================================================

import { daysBetween } from "../format/relativeDay.ts";

export const INACTIVE_DAYS = 7;

export type SignalKind = "pain" | "inactive" | "ok";

export interface SignalInput {
  /** Sortie de `assessSignals` (lib/exercise/stageProgress.ts). */
  concerning: boolean;
  severe: boolean;
  /** Dernière note de douleur (14 jours), pour l'affichage « 7/10 ». */
  lastPain: number | null;
  lastSessionAt: string | null;
  /** `patients.created_at` — un compte de moins de 7 jours n'est jamais « inactif ». */
  createdAt: string;
  now?: Date;
}

export interface Signal {
  kind: SignalKind;
  label: string;
  severe: boolean;
  score: number | null;
  days: number | null;
}

export function computeSignal({ concerning, severe, lastPain, lastSessionAt, createdAt, now = new Date() }: SignalInput): Signal {
  if (concerning) {
    const score = lastPain != null ? Math.round(lastPain) : null;
    return {
      kind: "pain",
      label: score != null ? `Douleur signalée ${score}/10` : "Douleur signalée",
      severe,
      score,
      days: null,
    };
  }

  const accountAge = daysBetween(createdAt, now);
  const days = lastSessionAt ? daysBetween(lastSessionAt, now) : accountAge;
  if (days >= INACTIVE_DAYS && accountAge >= INACTIVE_DAYS) {
    return { kind: "inactive", label: `Aucune séance depuis ${days} jours`, severe: false, score: null, days };
  }
  return { kind: "ok", label: "À jour", severe: false, score: null, days: null };
}
```

Run: `npm test` → tous les tests passent.

- [ ] **Step 11: `STAGE_SHORT`**

Dans `lib/exercise/prescription.ts`, juste après `STAGE_LABELS`, ajouter :

```ts
/** Libellé court pour les badges (le libellé complet va dans `title`). */
export const STAGE_SHORT: Record<InjuryStage, string> = {
  acute: "Phase 1",
  subacute: "Phase 2",
  recovery: "Phase 3",
  return_to_sport: "Phase 4",
};
```

- [ ] **Step 12: Typecheck, lint, commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: tout passe. (Si `tsc` se plaint des imports `.ts` explicites, ajouter `"allowImportingTsExtensions": true` dans `compilerOptions` de `tsconfig.json` — Next.js 16 l'accepte avec `noEmit`.)

```bash
git add package.json tsconfig.json lib/format lib/exercise/adherence.ts lib/exercise/adherence.test.ts lib/dashboard/patientSignal.ts lib/dashboard/patientSignal.test.ts lib/exercise/prescription.ts
git commit -m "Modules partagés : dates relatives, initiales, adhérence, signal patient (+ tests node --test)"
```

---

### Task 3: Sidebar sombre + fond de l'app

**Files:**
- Modify: `components/DashboardSidebar.tsx` (réécriture complète)
- Modify: `app/dashboard/layout.tsx:68-87` (le `return` final)

**Interfaces:**
- Produces: `DashboardSidebar({ instructorName }: { instructorName: string | null })`.
- Consumes: `initials()` (Tâche 2), `LogoMark` (`components/Logo.tsx`).

- [ ] **Step 1: Réécrire `components/DashboardSidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { LayoutDashboard, UsersRound, Dumbbell, ListChecks, Wallet, LogOut } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { initials } from "@/lib/format/initials";

const LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/patients", label: "Mes patients", icon: UsersRound },
  { href: "/dashboard/seances", label: "Mes séances", icon: Dumbbell },
  { href: "/dashboard/exercises", label: "Mes exercices", icon: ListChecks },
  { href: "/dashboard/facturation", label: "Tarif & paiements", icon: Wallet },
];

// Une seule barre de navigation pour tout /dashboard/* : colonne sombre à
// gauche sur desktop, barre horizontale défilable sur mobile. Les mêmes
// cinq destinations dans les deux cas.
export default function DashboardSidebar({ instructorName }: { instructorName: string | null }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const linkClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
      active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-56 shrink-0 flex-col bg-sidebar p-4 text-white sm:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-1">
          <LogoMark size={26} />
          <span className="text-base font-semibold">EasyPhysio</span>
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(isActive(link.href, link.exact))}>
              <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 px-2 pt-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold">
            {initials(instructorName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{instructorName ?? "Praticien"}</p>
            <p className="text-xs text-white/60">Kinésithérapeute</p>
          </div>
        </div>
        <SignOutButton redirectUrl="/login">
          <button type="button" className={`mt-2 w-full ${linkClass(false)}`}>
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </SignOutButton>
      </aside>

      {/* Mobile */}
      <nav className="flex items-center gap-1 overflow-x-auto bg-sidebar p-2 text-white sm:hidden">
        <Link href="/" className="flex shrink-0 items-center px-2 py-2" aria-label="Retour au site EasyPhysio">
          <LogoMark size={22} />
        </Link>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={`shrink-0 ${linkClass(isActive(link.href, link.exact))}`}>
            <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {link.label}
          </Link>
        ))}
        <SignOutButton redirectUrl="/login">
          <button type="button" className={`shrink-0 ${linkClass(false)}`}>
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </SignOutButton>
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Mettre à jour `app/dashboard/layout.tsx`**

Remplacer le `return` final (lignes 68–87) par :

```tsx
  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-ink sm:flex-row">
      <DashboardSidebar instructorName={instructor.full_name ?? null} />
      <div className="relative flex-1">{children}</div>
    </div>
  );
```

Dans le même fichier, l'écran « Compte en cours de validation » (lignes 27–65) : remplacer `bg-[#faf7f2]` par `bg-app-bg`, `border-slate-200` par `border-line`, `text-slate-900` par `text-ink`, `text-slate-600`/`text-slate-500` par `text-muted`, `border-slate-300` par `border-line`, `hover:bg-slate-50` par `hover:bg-app-bg`, `hover:text-slate-700` par `hover:text-ink`, et retirer `font-display` du `<h1>`.

- [ ] **Step 3: Typecheck, lint, vérification visuelle**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur. Ouvrir `http://localhost:3000/dashboard` (le serveur `npm run dev` doit tourner) : sidebar bleu nuit, bloc utilisateur avec initiales en bas, fond de page `#f5f7fb`, plus de halo ambré.

- [ ] **Step 4: Commit**

```bash
git add components/DashboardSidebar.tsx app/dashboard/layout.tsx
git commit -m "Sidebar sombre avec bloc utilisateur, fond de l'app kiné unifié"
```

---

### Task 4: Lignes du tableau des patients (`patientRows`)

**Files:**
- Create: `lib/dashboard/patientRows.ts`, `lib/dashboard/patientRows.test.ts`

**Interfaces:**
- Consumes: `computeAdherence`, `adherenceLabel`, `adherenceTone` (Tâche 2), `computeSignal` (Tâche 2), `relativeDay` (Tâche 2), `STAGE_LABELS`/`STAGE_SHORT` (`lib/exercise/prescription.ts`), `assessSignals` (`lib/exercise/stageProgress.ts`), `initials` (Tâche 2).
- Produces:
  ```ts
  export interface PatientRow {
    id: string; name: string; initials: string;
    conditionId: string | null; conditionName: string | null;
    stage: InjuryStage | null; stageShort: string | null; stageLabel: string | null;
    lastSessionAt: string | null; lastSessionLabel: string;
    adherence: Adherence; adherenceLabel: "Bonne" | "Moyenne" | "Faible" | null; adherenceTone: "ok" | "warn" | "danger" | "muted";
    signal: Signal;
  }
  export function buildPatientRows(input: PatientRowsInput): PatientRow[]
  export async function loadPatientRows(supabase: SupabaseClient): Promise<PatientRow[]>
  ```

- [ ] **Step 1: Test de `buildPatientRows`**

`lib/dashboard/patientRows.test.ts` :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPatientRows } from "./patientRows.ts";

const now = new Date(2026, 8, 3, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

const input = {
  now,
  patients: [
    { id: "p1", full_name: "Marc T.", condition_id: "c1", created_at: daysAgo(60) },
    { id: "p2", full_name: "Sophie R.", condition_id: "c2", created_at: daysAgo(60) },
    { id: "p3", full_name: "Paul M.", condition_id: null, created_at: daysAgo(2) },
  ],
  profiles: [{ id: "p1", injury_stage: "acute" }, { id: "p2", injury_stage: "recovery" }],
  conditions: [{ id: "c1", name: "Prothèse genou" }, { id: "c2", name: "Entorse cheville" }],
  logs: [
    { patient_id: "p1", completed_at: daysAgo(0) },
    { patient_id: "p1", completed_at: daysAgo(2) },
    { patient_id: "p2", completed_at: daysAgo(9) },
  ],
  feedback: [
    { patient_id: "p1", pain_score: 7, difficulty: null, created_at: daysAgo(0) },
    { patient_id: "p1", pain_score: 8, difficulty: null, created_at: daysAgo(2) },
  ],
  recs: [
    { patient_id: "p1", created_at: daysAgo(30), times_per_week: 3 },
    { patient_id: "p2", created_at: daysAgo(30), times_per_week: 2 },
  ],
};

test("douleur, phase courte, adhérence et libellés", () => {
  const rows = buildPatientRows(input);
  const marc = rows.find((r) => r.id === "p1")!;
  assert.equal(marc.initials, "MT");
  assert.equal(marc.conditionName, "Prothèse genou");
  assert.equal(marc.stageShort, "Phase 1");
  assert.equal(marc.lastSessionLabel, "Aujourd'hui");
  assert.equal(marc.signal.kind, "pain");
  assert.equal(marc.signal.label, "Douleur signalée 7/10"); // dernière note, pas la moyenne
  assert.equal(marc.adherence.expected, 12);
  assert.equal(marc.adherence.done, 2);
  assert.equal(marc.adherenceTone, "danger");
});

test("inactivité et à jour", () => {
  const rows = buildPatientRows(input);
  const sophie = rows.find((r) => r.id === "p2")!;
  assert.equal(sophie.signal.kind, "inactive");
  assert.equal(sophie.signal.label, "Aucune séance depuis 9 jours");
  assert.equal(sophie.lastSessionLabel, "Il y a 9 jours".replace("Il y a 9 jours", sophie.lastSessionLabel)); // libellé de relativeDay, quel qu'il soit
  const paul = rows.find((r) => r.id === "p3")!;
  assert.equal(paul.signal.kind, "ok"); // compte de 2 jours : jamais « inactif »
  assert.equal(paul.conditionName, null);
  assert.equal(paul.adherence.pct, null);
});

test("tri : douleur sévère, douleur, inactif, puis alphabétique", () => {
  const rows = buildPatientRows(input);
  assert.deepEqual(rows.map((r) => r.id), ["p1", "p2", "p3"]);
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm test`
Expected: échec « Cannot find module … patientRows.ts ».

- [ ] **Step 3: Implémenter `lib/dashboard/patientRows.ts`**

```ts
// =============================================================================
// Une ligne par patient pour le tableau « Mes patients » : phase, dernière
// séance, adhérence, signal. `buildPatientRows` est pur (testé) ;
// `loadPatientRows` fait les requêtes et l'appelle.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { STAGE_LABELS, STAGE_SHORT, type InjuryStage } from "../exercise/prescription.ts";
import { assessSignals, type ProgressSignals } from "../exercise/stageProgress.ts";
import { computeAdherence, adherenceLabel, adherenceTone, type Adherence } from "../exercise/adherence.ts";
import { computeSignal, type Signal } from "./patientSignal.ts";
import { relativeDay } from "../format/relativeDay.ts";
import { initials } from "../format/initials.ts";

export interface PatientRowsInput {
  now?: Date;
  patients: { id: string; full_name: string | null; condition_id: string | null; created_at: string }[];
  profiles: { id: string; injury_stage: string | null }[];
  conditions: { id: string; name: string }[];
  logs: { patient_id: string; completed_at: string }[];
  /** 14 derniers jours. */
  feedback: { patient_id: string; pain_score: number | null; difficulty: number | null; created_at: string }[];
  recs: { patient_id: string; created_at: string; times_per_week: number | null }[];
}

export interface PatientRow {
  id: string;
  name: string;
  initials: string;
  conditionId: string | null;
  conditionName: string | null;
  stage: InjuryStage | null;
  stageShort: string | null;
  stageLabel: string | null;
  lastSessionAt: string | null;
  lastSessionLabel: string;
  adherence: Adherence;
  adherenceLabel: "Bonne" | "Moyenne" | "Faible" | null;
  adherenceTone: "ok" | "warn" | "danger" | "muted";
  signal: Signal;
}

const SIGNAL_RANK: Record<Signal["kind"], number> = { pain: 0, inactive: 1, ok: 2 };

export function buildPatientRows({ now = new Date(), patients, profiles, conditions, logs, feedback, recs }: PatientRowsInput): PatientRow[] {
  const conditionName = new Map(conditions.map((c) => [c.id, c.name]));
  const stageOf = new Map(profiles.map((p) => [p.id, (p.injury_stage as InjuryStage | null) ?? null]));

  const logsBy = new Map<string, string[]>();
  for (const l of logs) (logsBy.get(l.patient_id) ?? logsBy.set(l.patient_id, []).get(l.patient_id)!).push(l.completed_at);

  const recsBy = new Map<string, { timesPerWeek: number | null; createdAt: string }[]>();
  for (const r of recs)
    (recsBy.get(r.patient_id) ?? recsBy.set(r.patient_id, []).get(r.patient_id)!).push({ timesPerWeek: r.times_per_week, createdAt: r.created_at });

  const signalsBy = new Map<string, ProgressSignals & { lastPain: number | null; lastPainAt: string }>();
  for (const f of feedback) {
    const b = signalsBy.get(f.patient_id) ?? signalsBy.set(f.patient_id, { painScores: [], difficulties: [], lastPain: null, lastPainAt: "" }).get(f.patient_id)!;
    if (f.pain_score != null) {
      b.painScores.push({ value: f.pain_score, at: f.created_at });
      if (f.created_at > b.lastPainAt) { b.lastPain = f.pain_score; b.lastPainAt = f.created_at; }
    }
    if (f.difficulty != null) b.difficulties.push({ value: f.difficulty, at: f.created_at });
  }

  const rows = patients.map<PatientRow>((p) => {
    const completed = logsBy.get(p.id) ?? [];
    const lastSessionAt = completed.length ? completed.reduce((a, b) => (a > b ? a : b)) : null;
    const stage = stageOf.get(p.id) ?? null;
    const sig = signalsBy.get(p.id) ?? { painScores: [], difficulties: [], lastPain: null, lastPainAt: "" };
    const assessment = assessSignals({ painScores: sig.painScores, difficulties: sig.difficulties });
    const adherence = computeAdherence({ completedAt: completed, recommendations: recsBy.get(p.id) ?? [], now });
    return {
      id: p.id,
      name: p.full_name ?? "Patient",
      initials: initials(p.full_name),
      conditionId: p.condition_id,
      conditionName: p.condition_id ? (conditionName.get(p.condition_id) ?? null) : null,
      stage,
      stageShort: stage ? STAGE_SHORT[stage] : null,
      stageLabel: stage ? STAGE_LABELS[stage] : null,
      lastSessionAt,
      lastSessionLabel: relativeDay(lastSessionAt, now),
      adherence,
      adherenceLabel: adherenceLabel(adherence.pct),
      adherenceTone: adherenceTone(adherence.pct),
      signal: computeSignal({
        concerning: assessment.concerning,
        severe: assessment.severe,
        lastPain: sig.lastPain,
        lastSessionAt,
        createdAt: p.created_at,
        now,
      }),
    };
  });

  return rows.sort(
    (a, b) =>
      SIGNAL_RANK[a.signal.kind] - SIGNAL_RANK[b.signal.kind] ||
      Number(b.signal.severe) - Number(a.signal.severe) ||
      a.name.localeCompare(b.name, "fr"),
  );
}

/** Toutes les requêtes en parallèle ; RLS limite chaque table aux patients du kiné connecté. */
export async function loadPatientRows(supabase: SupabaseClient, now: Date = new Date()): Promise<PatientRow[]> {
  const since14 = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const [{ data: patients }, { data: profiles }, { data: conditions }, { data: logs }, { data: feedback }, { data: recs }] =
    await Promise.all([
      supabase.from("patients").select("id, full_name, condition_id, created_at"),
      supabase.from("patient_profiles").select("id, injury_stage"),
      supabase.from("conditions").select("id, name"),
      supabase.from("workout_logs").select("patient_id, completed_at"),
      supabase.from("patient_feedback").select("patient_id, pain_score, difficulty, created_at").gte("created_at", since14),
      supabase.from("patient_recommended_workouts").select("patient_id, created_at, workouts ( times_per_week )"),
    ]);

  return buildPatientRows({
    now,
    patients: (patients ?? []) as PatientRowsInput["patients"],
    profiles: (profiles ?? []) as PatientRowsInput["profiles"],
    conditions: (conditions ?? []) as PatientRowsInput["conditions"],
    logs: (logs ?? []) as PatientRowsInput["logs"],
    feedback: (feedback ?? []) as PatientRowsInput["feedback"],
    recs: (recs ?? []).map((r) => ({
      patient_id: r.patient_id as string,
      created_at: r.created_at as string,
      times_per_week: ((r.workouts as unknown as { times_per_week: number | null } | null)?.times_per_week ?? null),
    })),
  });
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npm test`
Expected: les 3 tests `patientRows` passent (le test « Il y a 9 jours » compare au libellé réel de `relativeDay`).

- [ ] **Step 5: Typecheck, lint, commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add lib/dashboard/patientRows.ts lib/dashboard/patientRows.test.ts
git commit -m "Lignes du tableau des patients : phase, dernière séance, adhérence, signal"
```

---

### Task 5: Page « Mes patients » — tableau, filtres, squelette

**Files:**
- Create: `components/PatientsTable.tsx`
- Modify: `app/dashboard/patients/page.tsx` (réécriture)
- Modify: `app/dashboard/patients/loading.tsx` (réécriture)
- Modify: `app/dashboard/patients/new/page.tsx` (tokens uniquement)
- Delete: `components/PatientsFilter.tsx`

**Interfaces:**
- Consumes: `loadPatientRows`, `PatientRow` (Tâche 4), `STAGE_LABELS`/`STAGE_SHORT`.
- Produces: `PatientsTable({ rows, conditions, initialSegment })` avec `initialSegment: "tous" | "surveiller" | "jour"`. Le paramètre d'URL `?filtre=surveiller` (posé par le tableau de bord, Tâche 7) présélectionne le segment.

- [ ] **Step 1: Créer `components/PatientsTable.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, SlidersHorizontal, UserPlus } from "lucide-react";
import type { PatientRow } from "@/lib/dashboard/patientRows";
import { STAGE_LABELS, STAGE_SHORT, type InjuryStage } from "@/lib/exercise/prescription";

export type Segment = "tous" | "surveiller" | "jour";

const TONE_TEXT = { ok: "text-ok", warn: "text-warn", danger: "text-danger", muted: "text-muted" } as const;
const TONE_BAR = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger", muted: "bg-line" } as const;
const SIGNAL_TEXT = { pain: "text-danger", inactive: "text-warn", ok: "text-ok" } as const;

function SignalCell({ row }: { row: PatientRow }) {
  const s = row.signal;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${SIGNAL_TEXT[s.kind]}`}>
      {s.kind === "ok" && <span className="h-1.5 w-1.5 rounded-full bg-ok" />}
      {s.kind === "pain" && s.severe && <span className="h-1.5 w-1.5 rounded-full bg-danger animate-[gentlePulse_2.4s_ease-in-out_infinite]" />}
      {s.label}
    </span>
  );
}

function AdherenceCell({ row }: { row: PatientRow }) {
  if (row.adherence.pct === null) return <span className="text-sm text-muted">—</span>;
  return (
    <div className="min-w-[4.5rem]">
      <span className={`text-sm font-semibold tabular-nums ${TONE_TEXT[row.adherenceTone]}`}>{row.adherence.pct} %</span>
      <div className="mt-1 h-1 w-full rounded-full bg-line">
        <div className={`h-1 rounded-full ${TONE_BAR[row.adherenceTone]}`} style={{ width: `${row.adherence.pct}%` }} />
      </div>
    </div>
  );
}

function PhaseBadge({ row }: { row: PatientRow }) {
  if (!row.stageShort) return <span className="text-sm text-muted">—</span>;
  return (
    <span title={row.stageLabel ?? undefined} className="inline-flex rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
      {row.stageShort}
    </span>
  );
}

export default function PatientsTable({
  rows,
  conditions,
  initialSegment = "tous",
}: {
  rows: PatientRow[];
  conditions: { id: string; name: string }[];
  initialSegment?: Segment;
}) {
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<Segment>(initialSegment);
  const [conditionId, setConditionId] = useState("");
  const [stage, setStage] = useState<InjuryStage | "">("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const counts = useMemo(
    () => ({
      tous: rows.length,
      surveiller: rows.filter((r) => r.signal.kind !== "ok").length,
      jour: rows.filter((r) => r.signal.kind === "ok").length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (segment === "surveiller" && r.signal.kind === "ok") return false;
      if (segment === "jour" && r.signal.kind !== "ok") return false;
      if (conditionId && r.conditionId !== conditionId) return false;
      if (stage && r.stage !== stage) return false;
      if (query && !r.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [rows, q, segment, conditionId, stage]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <UserPlus className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <p className="mt-4 font-semibold text-ink">Aucun patient pour le moment</p>
        <p className="mt-1 text-sm text-muted">Ajoutez votre premier patient pour lui assigner une condition et un programme d&apos;exercices.</p>
        <Link href="/dashboard/patients/new" className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">
          Ajouter un patient
        </Link>
      </div>
    );
  }

  const segBtn = (key: Segment, label: string) => (
    <button
      type="button"
      onClick={() => setSegment(key)}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        segment === key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {label} <span className="tabular-nums text-muted">({counts[key]})</span>
    </button>
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un patient…"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </label>
        <div className="flex items-center gap-1 rounded-full border border-line bg-app-bg p-1">
          {segBtn("tous", "Tous")}
          {segBtn("surveiller", "À surveiller")}
          {segBtn("jour", "À jour")}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          aria-label="Filtres condition et phase"
          className={`flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface ${filtersOpen || conditionId || stage ? "text-brand" : "text-muted"}`}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {filtersOpen && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select value={conditionId} onChange={(e) => setConditionId(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:w-56">
            <option value="">Toutes conditions</option>
            {conditions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value as InjuryStage | "")} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:w-64">
            <option value="">Toutes phases</option>
            {(Object.keys(STAGE_LABELS) as InjuryStage[]).map((s) => <option key={s} value={s}>{STAGE_SHORT[s]} — {STAGE_LABELS[s]}</option>)}
          </select>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Aucun patient ne correspond à ces critères.</p>
        ) : (
          <>
            {/* Desktop : tableau */}
            <table className="hidden w-full md:table">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Phase</th>
                  <th className="px-4 py-3 font-medium">Dernière séance</th>
                  <th className="px-4 py-3 font-medium">Adhérence</th>
                  <th className="px-4 py-3 font-medium">Signal</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="group border-b border-line last:border-b-0 hover:bg-app-bg">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/patients/${r.id}`} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{r.initials}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                          <span className="block truncate text-xs text-muted">{r.conditionName ?? "Condition non assignée"}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><PhaseBadge row={r} /></td>
                    <td className="px-4 py-3 text-sm text-ink">{r.lastSessionLabel}</td>
                    <td className="px-4 py-3"><AdherenceCell row={r} /></td>
                    <td className="px-4 py-3"><SignalCell row={r} /></td>
                    <td className="px-2 py-3 text-muted"><ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile : liste */}
            <ul className="divide-y divide-line md:hidden">
              {visible.map((r) => (
                <li key={r.id}>
                  <Link href={`/dashboard/patients/${r.id}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{r.initials}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{r.name}</span>
                        <SignalCell row={r} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {r.conditionName ?? "Condition non assignée"} · {r.lastSessionLabel}
                        {r.adherence.pct !== null && ` · ${r.adherence.pct} %`}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Réécrire `app/dashboard/patients/page.tsx`**

```tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { loadPatientRows } from "@/lib/dashboard/patientRows";
import PatientsTable, { type Segment } from "@/components/PatientsTable";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const { filtre } = await searchParams;
  const supabase = await createClient();
  await requireUser(supabase);

  const [rows, { data: conditions }] = await Promise.all([
    loadPatientRows(supabase),
    supabase.from("conditions").select("id, name").order("name"),
  ]);
  const initialSegment: Segment = filtre === "surveiller" ? "surveiller" : filtre === "jour" ? "jour" : "tous";

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Mes patients</h1>
            <p className="mt-1 text-sm text-muted">Suivez tous vos patients et intervenez en quelques clics.</p>
          </div>
          <Link href="/dashboard/patients/new" className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Ajouter un patient
          </Link>
        </div>
        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-6">
          <PatientsTable rows={rows} conditions={conditions ?? []} initialSegment={initialSegment} />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Réécrire `app/dashboard/patients/loading.tsx`**

```tsx
export default function PatientsLoading() {
  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-5xl motion-safe:animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-40 rounded bg-line" />
            <div className="mt-2 h-4 w-72 rounded bg-line" />
          </div>
          <div className="h-9 w-40 rounded-full bg-line" />
        </div>
        <div className="mt-6 flex gap-3">
          <div className="h-9 flex-1 rounded-lg bg-line" />
          <div className="h-9 w-64 rounded-full bg-line" />
          <div className="h-9 w-9 rounded-lg bg-line" />
        </div>
        <div className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14" />)}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Tokens sur `app/dashboard/patients/new/page.tsx`**

Remplacements dans ce fichier : `text-stone-500` → `text-muted` ; `rounded-xl border border-stone-200 bg-white p-8 transition-all … hover:shadow-[…]` → `rounded-xl border border-line bg-surface p-8` ; `font-display mb-1 text-2xl font-semibold text-stone-900` → `mb-1 text-2xl font-semibold text-ink` ; `border-stone-200 border-l-[3px] border-l-red-600 bg-white p-3 text-sm text-red-800` → `border-line bg-danger-soft p-3 text-sm text-danger` ; `text-stone-700` → `text-ink` ; `border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-500 focus:ring-2 focus:ring-stone-200` → `border-line bg-surface px-3 py-2 text-ink focus:border-brand focus:ring-2 focus:ring-brand-soft` ; `rounded-lg bg-blue-600 py-2 … hover:bg-blue-700` → `rounded-full bg-brand py-2.5 … hover:bg-brand-dark`.

- [ ] **Step 5: Supprimer l'ancien composant**

```bash
git rm components/PatientsFilter.tsx
```

Run: `grep -rn "PatientsFilter" app components` → aucun résultat.

- [ ] **Step 6: Typecheck, lint, vérification visuelle**

Run: `npx tsc --noEmit && npm run lint`
Ouvrir `/dashboard/patients` : tableau à 5 colonnes, segmenté avec compteurs, icône filtre qui déplie condition/phase, ligne → fiche ; réduire la fenêtre sous 768 px : liste à deux lignes. Ouvrir `/dashboard/patients?filtre=surveiller` : segment « À surveiller » présélectionné.

- [ ] **Step 7: Commit**

```bash
git add components/PatientsTable.tsx app/dashboard/patients/page.tsx app/dashboard/patients/loading.tsx app/dashboard/patients/new/page.tsx
git commit -m "Mes patients : tableau phase / dernière séance / adhérence / signal, filtres Tous · À surveiller · À jour"
```

---

### Task 6: Données du tableau de bord (`homeData`)

**Files:**
- Create: `lib/dashboard/homeData.ts`, `lib/dashboard/homeData.test.ts`

**Interfaces:**
- Consumes: `computeSignal` (Tâche 2), `assessSignals`/`PAIN_HOLD` (`lib/exercise/stageProgress.ts`), `relativeDay`, `initials`, `getInstructor` (`lib/dashboard/instructor.ts`).
- Produces:
  ```ts
  export interface Tile { value: number; delta: number | null }
  export interface ToTreatRow { id: string; name: string; initials: string; kind: "pain" | "inactive"; label: string; score: number | null; severe: boolean }
  export interface RecentRow { logId: string; patientId: string; name: string; initials: string; whenLabel: string }
  export interface DashboardHome {
    firstName: string; todayLabel: string;
    sessionsToday: Tile; painToday: Tile; inactiveCount: number; patientCount: number;
    toTreat: ToTreatRow[]; surveillerCount: number; recent: RecentRow[]; banner: string | null;
  }
  export function buildDashboardHome(input: DashboardHomeInput): Omit<DashboardHome, "firstName">
  export async function loadDashboardHome(supabase: SupabaseClient, userId: string): Promise<DashboardHome>
  ```

- [ ] **Step 1: Tests**

`lib/dashboard/homeData.test.ts` :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDashboardHome } from "./homeData.ts";

const now = new Date(2026, 8, 3, 15); // mercredi 3 septembre 2026
const at = (daysAgo: number, hour = 10) => new Date(2026, 8, 3 - daysAgo, hour).toISOString();

const input = {
  now,
  patients: [
    { id: "p1", full_name: "Marc T.", created_at: at(60) },
    { id: "p2", full_name: "Sophie R.", created_at: at(60) },
    { id: "p3", full_name: "Paul M.", created_at: at(60) },
    { id: "p4", full_name: "Julie L.", created_at: at(2) },
  ],
  logs: [
    { id: "l1", patient_id: "p1", completed_at: at(0, 9) },
    { id: "l2", patient_id: "p3", completed_at: at(0, 8) },
    { id: "l3", patient_id: "p3", completed_at: at(1) },
    { id: "l4", patient_id: "p2", completed_at: at(9) },
  ],
  feedback: [
    { patient_id: "p1", pain_score: 7, difficulty: null, created_at: at(0, 9) },
    { patient_id: "p1", pain_score: 6, difficulty: null, created_at: at(3) },
    { patient_id: "p3", pain_score: 2, difficulty: null, created_at: at(0, 8) },
  ],
};

test("tuiles : séances et douleurs du jour avec variation vs hier", () => {
  const h = buildDashboardHome(input);
  assert.deepEqual(h.sessionsToday, { value: 2, delta: 1 }); // 2 aujourd'hui, 1 hier
  assert.deepEqual(h.painToday, { value: 1, delta: 1 }); // 1 note ≥ 6 aujourd'hui, 0 hier
  assert.equal(h.inactiveCount, 1); // Sophie (9 jours) ; Julie a un compte de 2 jours
  assert.equal(h.patientCount, 4);
  assert.equal(h.todayLabel, "Mercredi 3 septembre");
});

test("à traiter : douleur avant inactivité, avec score", () => {
  const h = buildDashboardHome(input);
  assert.deepEqual(h.toTreat.map((r) => [r.id, r.kind]), [["p1", "pain"], ["p2", "inactive"]]);
  assert.equal(h.toTreat[0].label, "Douleur signalée");
  assert.equal(h.toTreat[0].score, 7);
  assert.equal(h.toTreat[1].label, "Aucune séance depuis 9 jours");
  assert.equal(h.surveillerCount, 2);
});

test("activité récente : 5 dernières séances, plus récente d'abord", () => {
  const h = buildDashboardHome(input);
  assert.deepEqual(h.recent.map((r) => [r.logId, r.whenLabel]), [["l1", "Aujourd'hui"], ["l2", "Aujourd'hui"], ["l3", "Hier"], ["l4", "Il y a 9 jours"]]);
  assert.equal(h.recent[0].name, "Marc T.");
});

test("bandeau : dernière douleur du jour, sinon null", () => {
  assert.equal(buildDashboardHome(input).banner, "Marc T. a signalé une douleur pendant sa séance.");
  assert.equal(buildDashboardHome({ ...input, feedback: [] }).banner, null);
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm test` → « Cannot find module … homeData.ts ».

- [ ] **Step 3: Implémenter `lib/dashboard/homeData.ts`**

```ts
// =============================================================================
// Tout ce que le tableau de bord affiche, calculé en un endroit testable.
// Les règles (douleur ≥ PAIN_HOLD, inactif ≥ 7 jours, 2 notes minimum) sont
// celles de stageProgress.ts et patientSignal.ts — jamais redéfinies ici.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { assessSignals, PAIN_HOLD, type ProgressSignals } from "../exercise/stageProgress.ts";
import { computeSignal } from "./patientSignal.ts";
import { relativeDay, daysBetween } from "../format/relativeDay.ts";
import { initials } from "../format/initials.ts";
import { getInstructor } from "./instructor";

export interface DashboardHomeInput {
  now?: Date;
  patients: { id: string; full_name: string | null; created_at: string }[];
  logs: { id: string; patient_id: string; completed_at: string }[];
  /** 14 derniers jours. */
  feedback: { patient_id: string; pain_score: number | null; difficulty: number | null; created_at: string }[];
}

export interface Tile { value: number; delta: number | null }
export interface ToTreatRow { id: string; name: string; initials: string; kind: "pain" | "inactive"; label: string; score: number | null; severe: boolean }
export interface RecentRow { logId: string; patientId: string; name: string; initials: string; whenLabel: string }

export interface DashboardHome {
  firstName: string;
  todayLabel: string;
  sessionsToday: Tile;
  painToday: Tile;
  inactiveCount: number;
  patientCount: number;
  toTreat: ToTreatRow[];
  surveillerCount: number;
  recent: RecentRow[];
  banner: string | null;
}

const TODAY_FMT = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export function buildDashboardHome({ now = new Date(), patients, logs, feedback }: DashboardHomeInput): Omit<DashboardHome, "firstName"> {
  const nameOf = new Map(patients.map((p) => [p.id, p.full_name ?? "Patient"]));
  const isToday = (iso: string) => daysBetween(iso, now) === 0;
  const isYesterday = (iso: string) => daysBetween(iso, now) === 1;

  const sessionsToday = logs.filter((l) => isToday(l.completed_at)).length;
  const sessionsYesterday = logs.filter((l) => isYesterday(l.completed_at)).length;
  const painRows = feedback.filter((f) => f.pain_score != null && f.pain_score >= PAIN_HOLD);
  const painToday = painRows.filter((f) => isToday(f.created_at)).length;
  const painYesterday = painRows.filter((f) => isYesterday(f.created_at)).length;

  // Signal par patient (même fonction que le tableau des patients).
  const lastSession = new Map<string, string>();
  for (const l of logs) if ((lastSession.get(l.patient_id) ?? "") < l.completed_at) lastSession.set(l.patient_id, l.completed_at);
  const signalsBy = new Map<string, ProgressSignals & { lastPain: number | null; lastPainAt: string }>();
  for (const f of feedback) {
    const b = signalsBy.get(f.patient_id) ?? signalsBy.set(f.patient_id, { painScores: [], difficulties: [], lastPain: null, lastPainAt: "" }).get(f.patient_id)!;
    if (f.pain_score != null) {
      b.painScores.push({ value: f.pain_score, at: f.created_at });
      if (f.created_at > b.lastPainAt) { b.lastPain = f.pain_score; b.lastPainAt = f.created_at; }
    }
    if (f.difficulty != null) b.difficulties.push({ value: f.difficulty, at: f.created_at });
  }

  const toTreat: ToTreatRow[] = [];
  for (const p of patients) {
    const sig = signalsBy.get(p.id) ?? { painScores: [], difficulties: [], lastPain: null, lastPainAt: "" };
    const a = assessSignals({ painScores: sig.painScores, difficulties: sig.difficulties });
    const s = computeSignal({ concerning: a.concerning, severe: a.severe, lastPain: sig.lastPain, lastSessionAt: lastSession.get(p.id) ?? null, createdAt: p.created_at, now });
    if (s.kind === "ok") continue;
    toTreat.push({
      id: p.id,
      name: p.full_name ?? "Patient",
      initials: initials(p.full_name),
      kind: s.kind,
      label: s.kind === "pain" ? "Douleur signalée" : s.label,
      score: s.score,
      severe: s.severe,
    });
  }
  toTreat.sort((x, y) => (x.kind === y.kind ? Number(y.severe) - Number(x.severe) || x.name.localeCompare(y.name, "fr") : x.kind === "pain" ? -1 : 1));

  const recent: RecentRow[] = [...logs]
    .sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1))
    .slice(0, 5)
    .map((l) => ({ logId: l.id, patientId: l.patient_id, name: nameOf.get(l.patient_id) ?? "Patient", initials: initials(nameOf.get(l.patient_id)), whenLabel: relativeDay(l.completed_at, now) }));

  const latestPainToday = painRows.filter((f) => isToday(f.created_at)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const banner = latestPainToday ? `${nameOf.get(latestPainToday.patient_id) ?? "Un patient"} a signalé une douleur pendant sa séance.` : null;

  const todayRaw = TODAY_FMT.format(now);
  return {
    todayLabel: todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1),
    sessionsToday: { value: sessionsToday, delta: sessionsToday - sessionsYesterday },
    painToday: { value: painToday, delta: painToday - painYesterday },
    inactiveCount: toTreat.filter((r) => r.kind === "inactive").length,
    patientCount: patients.length,
    toTreat,
    surveillerCount: toTreat.length,
    recent,
    banner,
  };
}

export async function loadDashboardHome(supabase: SupabaseClient, userId: string, now: Date = new Date()): Promise<DashboardHome> {
  const since14 = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const [instructor, { data: patients }, { data: logs }, { data: feedback }] = await Promise.all([
    getInstructor(supabase, userId),
    supabase.from("patients").select("id, full_name, created_at"),
    supabase.from("workout_logs").select("id, patient_id, completed_at"),
    supabase.from("patient_feedback").select("patient_id, pain_score, difficulty, created_at").gte("created_at", since14),
  ]);
  const firstName = instructor?.full_name ? instructor.full_name.split(" ")[0] : "";
  return {
    firstName,
    ...buildDashboardHome({
      now,
      patients: (patients ?? []) as DashboardHomeInput["patients"],
      logs: (logs ?? []) as DashboardHomeInput["logs"],
      feedback: (feedback ?? []) as DashboardHomeInput["feedback"],
    }),
  };
}
```

Note : l'import `./instructor` (sans `.ts`) n'est utilisé que par `loadDashboardHome`, jamais par le test ; si `node --test` échoue à le résoudre, écrire `./instructor.ts` — `instructor.ts` importe `react` (`cache`), présent dans `node_modules`, donc résoluble.

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `npm test` → les 4 tests `homeData` passent.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add lib/dashboard/homeData.ts lib/dashboard/homeData.test.ts
git commit -m "Données du tableau de bord : tuiles avec variation, à traiter, activité récente, bandeau"
```

---

### Task 7: Page « Tableau de bord »

**Files:**
- Modify: `app/dashboard/page.tsx` (réécriture complète)

**Interfaces:**
- Consumes: `loadDashboardHome`, `DashboardHome` (Tâche 6). Lien « Voir tout » → `/dashboard/patients?filtre=surveiller` (Tâche 5).

- [ ] **Step 1: Réécrire `app/dashboard/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight, Lightbulb, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";
import { loadDashboardHome, type Tile } from "@/lib/dashboard/homeData";

function Delta({ tile }: { tile: Tile }) {
  if (tile.delta === null) return null;
  if (tile.delta === 0) return <span className="flex items-center gap-1 text-xs text-muted"><Minus className="h-3 w-3" strokeWidth={2} />= hier</span>;
  const up = tile.delta > 0;
  return (
    <span className={`flex items-center gap-1 text-xs ${up ? "text-ok" : "text-danger"}`}>
      {up ? <ArrowUp className="h-3 w-3" strokeWidth={2} /> : <ArrowDown className="h-3 w-3" strokeWidth={2} />}
      {Math.abs(tile.delta)} vs hier
    </span>
  );
}

function StatTile({ value, label, tone, tile }: { value: number; label: string; tone: "ok" | "danger" | "warn" | "ink"; tile?: Tile }) {
  const color = { ok: "text-ok", danger: "text-danger", warn: "text-warn", ink: "text-ink" }[tone];
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className={`text-3xl font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="mt-1 text-sm text-ink">{label}</p>
      <div className="mt-1 h-4">{tile && <Delta tile={tile} />}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!(await getInstructor(supabase, user.id))) redirect("/patient");

  const h = await loadDashboardHome(supabase, user.id);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold text-ink">Bonjour {h.firstName}</h1>
          <p className="text-sm text-muted">{h.todayLabel}</p>
        </div>

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile value={h.sessionsToday.value} label="Séances faites" tone="ok" tile={h.sessionsToday} />
          <StatTile value={h.painToday.value} label="Douleurs signalées" tone="danger" tile={h.painToday} />
          <StatTile value={h.inactiveCount} label="Sans activité récente" tone="warn" />
          <StatTile value={h.patientCount} label="Patients suivis" tone="ink" />
        </div>

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:200ms] mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">À traiter aujourd&apos;hui</h2>
              {h.surveillerCount > 0 && (
                <Link href="/dashboard/patients?filtre=surveiller" className="text-xs font-medium text-brand hover:underline">
                  Voir tout ({h.surveillerCount})
                </Link>
              )}
            </div>
            {h.toTreat.length === 0 ? (
              <p className="mt-3 rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">Rien à traiter aujourd&apos;hui.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {h.toTreat.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/dashboard/patients/${r.id}`}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                        r.kind === "pain" ? "border-danger-soft bg-danger-soft hover:border-danger/30" : "border-line bg-surface hover:bg-app-bg"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${r.kind === "pain" ? "bg-surface text-danger" : "bg-warn-soft text-warn"}`}>
                        {r.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                          {r.severe && <span className="h-1.5 w-1.5 rounded-full bg-danger animate-[gentlePulse_2.4s_ease-in-out_infinite]" title="Situation sévère" />}
                          {r.name}
                        </span>
                        <span className={`block text-xs ${r.kind === "pain" ? "text-danger" : "text-warn"}`}>{r.label}</span>
                      </span>
                      {r.score !== null && <span className="text-sm font-semibold tabular-nums text-danger">{r.score}/10</span>}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Activité récente</h2>
              {h.recent.length > 0 && (
                <Link href="/dashboard/patients" className="text-xs font-medium text-brand hover:underline">Voir tout ({h.patientCount})</Link>
              )}
            </div>
            {h.recent.length === 0 ? (
              <p className="mt-3 rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">Aucune séance cette semaine.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
                {h.recent.map((r) => (
                  <li key={r.logId}>
                    <Link href={`/dashboard/patients/${r.patientId}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-app-bg">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ok-soft text-[11px] font-semibold text-ok">{r.initials}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink"><span className="font-semibold">{r.name}</span> a terminé sa séance</span>
                      <span className="shrink-0 text-xs text-muted">{r.whenLabel}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {h.banner && (
          <p className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:280ms] mt-8 flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">
            <Lightbulb className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {h.banner}
          </p>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck, lint, vérification visuelle**

Run: `npx tsc --noEmit && npm run lint`
Ouvrir `/dashboard` : 4 tuiles (2×2 sous 768 px), deux colonnes, bandeau si une douleur a été signalée aujourd'hui, « Voir tout (n) » → liste filtrée.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "Tableau de bord : tuiles du jour, à traiter, activité récente, bandeau"
```

---

### Task 8: Migration 0042 — séances rattachées à un patient

**Files:**
- Create: `supabase/migrations/0042_patient_workouts.sql`

**Interfaces:**
- Produces: colonnes `workouts.patient_id uuid null`, `workouts.source_workout_id uuid null` ; policies `workouts_select_visible`, `workouts_insert_owner` (réécrite), `workout_ex_select_visible`.

- [ ] **Step 1: Écrire le fichier de migration**

```sql
-- EasyPhysio — Migration 0042 : séances rattachées à un patient
-- À appliquer par Philippe (SQL Editor → New query → coller → Run). Rejouable.
--
-- EN CLAIR : quand un kiné clique « Ajuster la séance » pour un patient, l'app
-- crée une COPIE de la séance rattachée à ce patient (patient_id) et modifie
-- cette copie. Aujourd'hui, tout utilisateur connecté peut lire toutes les
-- séances. Après cette migration :
--   * une séance sans patient_id (plateforme ou cabinet) reste lisible par
--     tous les utilisateurs connectés, comme avant ;
--   * une séance rattachée à un patient n'est lisible QUE par ce patient et
--     par son kiné ;
--   * un kiné ne peut rattacher une séance qu'à l'un de SES patients ;
--   * les exercices d'une séance (workout_exercises) suivent la même règle.
-- Les règles de modification / suppression (créateur uniquement) ne changent
-- pas. Le trigger de la migration 0038 ne concerne que created_by is null,
-- donc jamais une copie (created_by = le kiné).

alter table public.workouts
  add column if not exists patient_id uuid references public.patients (id) on delete cascade,
  add column if not exists source_workout_id uuid references public.workouts (id) on delete set null;

create index if not exists idx_workouts_patient
  on public.workouts (patient_id) where patient_id is not null;

-- Lecture des séances.
drop policy if exists workouts_select_all on public.workouts;
drop policy if exists workouts_select_visible on public.workouts;
create policy workouts_select_visible on public.workouts
  for select to authenticated
  using (
    patient_id is null
    or patient_id = public.current_app_user_id()
    or exists (select 1 from public.patients p
               where p.id = workouts.patient_id
                 and p.instructor_id = public.current_app_user_id())
  );

-- Insertion : créateur = moi, je suis kiné, et si patient_id est renseigné
-- c'est un de mes patients.
drop policy if exists workouts_insert_owner on public.workouts;
create policy workouts_insert_owner on public.workouts
  for insert to authenticated
  with check (
    created_by = public.current_app_user_id()
    and exists (select 1 from public.instructors i where i.id = public.current_app_user_id())
    and (
      patient_id is null
      or exists (select 1 from public.patients p
                 where p.id = patient_id
                   and p.instructor_id = public.current_app_user_id())
    )
  );

-- Lecture des exercices d'une séance : même visibilité que la séance.
drop policy if exists workout_ex_select_all on public.workout_exercises;
drop policy if exists workout_ex_select_visible on public.workout_exercises;
create policy workout_ex_select_visible on public.workout_exercises
  for select to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_exercises.workout_id
      and (
        w.patient_id is null
        or w.patient_id = public.current_app_user_id()
        or exists (select 1 from public.patients p
                   where p.id = w.patient_id
                     and p.instructor_id = public.current_app_user_id())
      )
  ));
```

- [ ] **Step 2: Relire le SQL à voix haute (auto-contrôle)**

Vérifier : chaque `create policy` est précédé de son `drop policy if exists` ; `current_app_user_id()` partout (jamais `auth.uid()`) ; `alter table … add column if not exists` rejouable.

- [ ] **Step 3: Commit (sans appliquer)**

```bash
git add supabase/migrations/0042_patient_workouts.sql
git commit -m "Migration 0042 : séances rattachées à un patient (patient_id, visibilité restreinte)"
```

- [ ] **Step 4: Application par Philippe — pas par l'agent**

Dire à Philippe, mot pour mot : « La migration 0042 est prête dans `supabase/migrations/0042_patient_workouts.sql`. Elle ajoute deux colonnes à `workouts` et restreint la lecture : une séance rattachée à un patient n'est visible que par lui et son kiné ; tout le reste est lisible comme avant. Applique-la dans le SQL Editor de Supabase, puis dis-moi quand c'est fait. » **Ne pas continuer la Tâche 9 en production tant qu'elle n'est pas appliquée** (le code compile sans, mais l'action échouerait à l'exécution).

- [ ] **Step 5: Vérification manuelle par Philippe (après application)**

Dans le SQL Editor, en tant qu'owner :
```sql
select policyname from pg_policies where tablename in ('workouts','workout_exercises') order by 1;
```
Attendu : `workout_ex_select_visible`, `workout_ex_write_owner`, `workouts_delete_owner`, `workouts_insert_owner`, `workouts_select_visible`, `workouts_update_owner` — et **plus** de `workouts_select_all` ni `workout_ex_select_all`.

---

### Task 9: Action serveur « Ajuster la séance »

**Files:**
- Create: `lib/exercise/adjustPlan.ts`, `lib/exercise/adjustPlan.test.ts`
- Modify: `app/dashboard/patients/[id]/actions.ts` (ajout en fin de fichier)

**Interfaces:**
- Produces:
  - `applyAdjustment(current: ExerciseSlot[], removeIds: string[], addIds: string[]): ExerciseSlot[]` avec `ExerciseSlot = { exerciseId: string; position: number }`
  - `adjustmentMessage(workoutName: string, removed: number, added: number): string`
  - action `adjustPatientWorkout(formData: FormData): Promise<void>` — champs `patient_id`, `workout_id`, `remove_ids` (multiple), `add_ids` (multiple) ; redirige vers `/dashboard/patients/{id}?adjusted=1` ou `?error=`.

- [ ] **Step 1: Tests du module pur**

`lib/exercise/adjustPlan.test.ts` :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAdjustment, adjustmentMessage } from "./adjustPlan.ts";

const current = [
  { exerciseId: "a", position: 0 },
  { exerciseId: "b", position: 1 },
  { exerciseId: "c", position: 2 },
];

test("retire, ajoute en fin, renumérote", () => {
  assert.deepEqual(applyAdjustment(current, ["b"], ["d"]), [
    { exerciseId: "a", position: 0 },
    { exerciseId: "c", position: 1 },
    { exerciseId: "d", position: 2 },
  ]);
});

test("ignore les doublons et les ajouts déjà présents", () => {
  assert.deepEqual(applyAdjustment(current, [], ["a", "d", "d"]), [
    { exerciseId: "a", position: 0 },
    { exerciseId: "b", position: 1 },
    { exerciseId: "c", position: 2 },
    { exerciseId: "d", position: 3 },
  ]);
});

test("retirer puis ajouter le même exercice le garde (en fin)", () => {
  assert.deepEqual(applyAdjustment(current, ["a"], ["a"]), [
    { exerciseId: "b", position: 0 },
    { exerciseId: "c", position: 1 },
    { exerciseId: "a", position: 2 },
  ]);
});

test("message : accords et parties omises", () => {
  assert.equal(adjustmentMessage("Initiation genou", 1, 1), "J'ai ajusté votre séance « Initiation genou » : 1 exercice retiré, 1 exercice ajouté.");
  assert.equal(adjustmentMessage("Initiation genou", 0, 2), "J'ai ajusté votre séance « Initiation genou » : 2 exercices ajoutés.");
  assert.equal(adjustmentMessage("Initiation genou", 3, 0), "J'ai ajusté votre séance « Initiation genou » : 3 exercices retirés.");
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npm test` → « Cannot find module … adjustPlan.ts ».

- [ ] **Step 3: Implémenter `lib/exercise/adjustPlan.ts`**

```ts
// =============================================================================
// Calcul pur de la nouvelle liste d'exercices d'une séance ajustée, et du
// message envoyé au patient. Testé sans base de données.
// =============================================================================

export interface ExerciseSlot {
  exerciseId: string;
  position: number;
}

/** Retire `removeIds`, ajoute `addIds` (uniques, non déjà présents) en fin, renumérote 0..n-1. */
export function applyAdjustment(current: ExerciseSlot[], removeIds: string[], addIds: string[]): ExerciseSlot[] {
  const remove = new Set(removeIds);
  const kept = [...current].sort((a, b) => a.position - b.position).filter((s) => !remove.has(s.exerciseId)).map((s) => s.exerciseId);
  const present = new Set(kept);
  for (const id of addIds) {
    if (!present.has(id)) {
      kept.push(id);
      present.add(id);
    }
  }
  return kept.map((exerciseId, position) => ({ exerciseId, position }));
}

const plural = (n: number, word: string, pastParticiple: string) =>
  `${n} ${word}${n > 1 ? "s" : ""} ${pastParticiple}${n > 1 ? "s" : ""}`;

/** « J'ai ajusté votre séance « X » : 1 exercice retiré, 2 exercices ajoutés. » */
export function adjustmentMessage(workoutName: string, removed: number, added: number): string {
  const parts: string[] = [];
  if (removed > 0) parts.push(plural(removed, "exercice", "retiré"));
  if (added > 0) parts.push(plural(added, "exercice", "ajouté"));
  return `J'ai ajusté votre séance « ${workoutName} » : ${parts.join(", ")}.`;
}
```

Run: `npm test` → les 4 tests passent.

- [ ] **Step 4: Ajouter l'action serveur**

En fin de `app/dashboard/patients/[id]/actions.ts`, ajouter (les imports `redirect`, `revalidatePath`, `createClient`, `requireUser` existent déjà en tête de fichier ; ajouter `import { applyAdjustment, adjustmentMessage } from "@/lib/exercise/adjustPlan";`) :

```ts
// « Ajuster la séance » : la séance devient une copie personnelle du patient
// (workouts.patient_id), la recommandation pointe vers la copie, puis les
// retraits/ajouts s'appliquent à la copie. Le patient reçoit un message.
// Voir docs/superpowers/specs/2026-09-03-kine-interface-redesign-design.md § 7.
export async function adjustPatientWorkout(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  const removeIds = formData.getAll("remove_ids").map(String).filter(Boolean);
  const addIds = formData.getAll("add_ids").map(String).filter(Boolean);

  const fail = (msg: string) => redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(msg)}`);
  if (!patientId || !workoutId) fail("Séance introuvable.");
  if (removeIds.length === 0 && addIds.length === 0) redirect(`/dashboard/patients/${patientId}`);

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, description, condition_id, stage, duration_minutes, times_per_week, patient_id")
    .eq("id", workoutId)
    .maybeSingle();
  if (!workout) fail("Séance introuvable.");

  let targetId = workout!.id as string;

  if (workout!.patient_id !== patientId) {
    const { data: copy, error: copyError } = await supabase
      .from("workouts")
      .insert({
        name: workout!.name,
        description: workout!.description,
        condition_id: workout!.condition_id,
        stage: workout!.stage,
        duration_minutes: workout!.duration_minutes,
        times_per_week: workout!.times_per_week,
        created_by: user.id,
        patient_id: patientId,
        source_workout_id: workout!.id,
      })
      .select("id")
      .single();
    if (copyError || !copy) fail(copyError?.message ?? "Impossible de créer la séance du patient.");
    targetId = copy!.id as string;

    const { data: originalRows } = await supabase
      .from("workout_exercises")
      .select("exercise_id, position")
      .eq("workout_id", workout!.id);
    if (originalRows && originalRows.length) {
      await supabase.from("workout_exercises").insert(
        originalRows.map((r) => ({ workout_id: targetId, exercise_id: r.exercise_id, position: r.position })),
      );
    }

    const { error: recError } = await supabase
      .from("patient_recommended_workouts")
      .update({ workout_id: targetId })
      .eq("patient_id", patientId)
      .eq("workout_id", workout!.id);
    if (recError) fail(recError.message);
  }

  const { data: currentRows } = await supabase
    .from("workout_exercises")
    .select("exercise_id, position")
    .eq("workout_id", targetId);
  const current = (currentRows ?? []).map((r) => ({ exerciseId: r.exercise_id as string, position: r.position as number }));
  const next = applyAdjustment(current, removeIds, addIds);

  const removedCount = current.filter((s) => removeIds.includes(s.exerciseId)).length;
  const addedCount = next.length - (current.length - removedCount);

  await supabase.from("workout_exercises").delete().eq("workout_id", targetId);
  if (next.length) {
    const { error: insertError } = await supabase
      .from("workout_exercises")
      .insert(next.map((s) => ({ workout_id: targetId, exercise_id: s.exerciseId, position: s.position })));
    if (insertError) fail(insertError.message);
  }

  if (removedCount + addedCount > 0) {
    await supabase.from("patient_messages").insert({
      patient_id: patientId,
      instructor_id: user.id,
      sender: "instructor",
      body: adjustmentMessage(workout!.name as string, removedCount, addedCount),
    });
  }

  revalidatePath(`/dashboard/patients/${patientId}`);
  revalidatePath("/patient");
  revalidatePath("/patient/seance-du-jour");
  redirect(`/dashboard/patients/${patientId}?adjusted=1`);
}
```

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add lib/exercise/adjustPlan.ts lib/exercise/adjustPlan.test.ts "app/dashboard/patients/[id]/actions.ts"
git commit -m "Action « Ajuster la séance » : copie personnelle, retraits/ajouts, message au patient"
```

---

### Task 10: Modale « Ajuster la séance »

**Files:**
- Create: `components/AdjustWorkoutModal.tsx`

**Interfaces:**
- Consumes: `categoryFor`, `CATEGORY_ORDER` (`lib/exercise/category.ts`), `SubmitButton` (`components/SubmitButton.tsx`), action `adjustPatientWorkout` (Tâche 9, passée en prop).
- Produces:
  ```ts
  export type ModalExercise = { id: string; name: string };
  export default function AdjustWorkoutModal(props: {
    patientId: string; patientFirstName: string;
    workout: { id: string; name: string; exercises: ModalExercise[] } | null;
    addable: ModalExercise[];  // déjà filtrés : ni masqués, ni présents dans la séance
    action: (formData: FormData) => Promise<void>;
  })
  ```
  Rend le bouton « Ajuster la séance » (désactivé si `workout` est null) et la modale.

- [ ] **Step 1: Créer `components/AdjustWorkoutModal.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { CATEGORY_ORDER, categoryFor, type Category } from "@/lib/exercise/category";
import SubmitButton from "@/components/SubmitButton";

export type ModalExercise = { id: string; name: string };

export default function AdjustWorkoutModal({
  patientId,
  patientFirstName,
  workout,
  addable,
  action,
}: {
  patientId: string;
  patientFirstName: string;
  workout: { id: string; name: string; exercises: ModalExercise[] } | null;
  addable: ModalExercise[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [removeIds, setRemoveIds] = useState<Set<string>>(new Set());
  const [addIds, setAddIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setRemoveIds(new Set());
    setAddIds(new Set());
    setQ("");
  };

  const groups = useMemo(() => {
    const m = new Map<Category, ModalExercise[]>();
    for (const ex of addable) (m.get(categoryFor(ex.name)) ?? m.set(categoryFor(ex.name), []).get(categoryFor(ex.name))!).push(ex);
    return m;
  }, [addable]);
  const query = q.trim().toLowerCase();

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const removed = removeIds.size;
  const added = addIds.size;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!workout}
        title={workout ? undefined : "Ajoutez d'abord une séance recommandée"}
        className="inline-flex items-center rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        Ajuster la séance
      </button>

      {open && workout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={close}>
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`Ajuster la séance ${workout.name}`}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-surface shadow-sm outline-none"
          >
            <div className="flex items-start justify-between border-b border-line px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Ajuster la séance</h2>
                <p className="mt-0.5 text-sm text-muted">{workout.name} — les modifications ne concernent que {patientFirstName}.</p>
              </div>
              <button type="button" onClick={close} aria-label="Fermer" className="rounded-lg p-1.5 text-muted hover:bg-app-bg hover:text-ink">
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <form action={action} className="flex min-h-0 flex-1 flex-col">
              <input type="hidden" name="patient_id" value={patientId} />
              <input type="hidden" name="workout_id" value={workout.id} />
              {[...removeIds].map((id) => <input key={`r-${id}`} type="hidden" name="remove_ids" value={id} />)}
              {[...addIds].map((id) => <input key={`a-${id}`} type="hidden" name="add_ids" value={id} />)}

              <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Exercices actuels</p>
                  <ul className="mt-2 space-y-1.5">
                    {workout.exercises.map((ex) => {
                      const marked = removeIds.has(ex.id);
                      return (
                        <li key={ex.id}>
                          <button
                            type="button"
                            onClick={() => setRemoveIds((s) => toggle(s, ex.id))}
                            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                              marked ? "border-danger-soft bg-danger-soft text-danger" : "border-line bg-surface text-ink hover:bg-app-bg"
                            }`}
                          >
                            <span className="flex-1 truncate">{ex.name}</span>
                            {marked ? (
                              <span className="flex items-center gap-1 text-xs font-medium">À retirer <X className="h-3.5 w-3.5" strokeWidth={2} /></span>
                            ) : (
                              <Check className="h-4 w-4 text-brand" strokeWidth={2} />
                            )}
                          </button>
                        </li>
                      );
                    })}
                    {workout.exercises.length === 0 && <li className="text-sm text-muted">Cette séance est vide.</li>}
                  </ul>
                </section>

                <section className="flex min-h-0 flex-col">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ajouter un exercice</p>
                  <label className="relative mt-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
                    <input
                      type="search"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Rechercher un exercice…"
                      className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                    />
                  </label>
                  <div className="mt-2 max-h-72 space-y-3 overflow-y-auto pr-1 md:max-h-none md:flex-1">
                    {CATEGORY_ORDER.map((cat) => {
                      const list = (groups.get(cat) ?? []).filter((ex) => !query || ex.name.toLowerCase().includes(query));
                      if (list.length === 0) return null;
                      return (
                        <div key={cat}>
                          <p className="sticky top-0 bg-surface py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{cat}</p>
                          <ul className="space-y-1">
                            {list.map((ex) => {
                              const marked = addIds.has(ex.id);
                              return (
                                <li key={ex.id}>
                                  <button
                                    type="button"
                                    onClick={() => setAddIds((s) => toggle(s, ex.id))}
                                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                      marked ? "border-ok-soft bg-ok-soft text-ok" : "border-line bg-surface text-ink hover:bg-app-bg"
                                    }`}
                                  >
                                    <span className="flex-1 truncate">{ex.name}</span>
                                    {marked ? <span className="text-xs font-medium">À ajouter</span> : <Plus className="h-4 w-4 text-brand" strokeWidth={2} />}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="border-t border-line px-6 py-4">
                {(removed > 0 || added > 0) && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {removed > 0 && <span className="rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger">{removed} exercice{removed > 1 ? "s" : ""} retiré{removed > 1 ? "s" : ""}</span>}
                    {added > 0 && <span className="rounded-full bg-ok-soft px-3 py-1 text-xs font-medium text-ok">{added} exercice{added > 1 ? "s" : ""} ajouté{added > 1 ? "s" : ""}</span>}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={close} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg">Annuler</button>
                  <SubmitButton
                    pendingText="Enregistrement…"
                    disabled={removed === 0 && added === 0}
                    className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    Enregistrer les modifications
                  </SubmitButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

Note : `SubmitButton` fusionne `disabled` avec `pending` via `{...rest}` placé après `disabled={pending}` — quand `removed === 0 && added === 0`, `rest.disabled = true` l'emporte ; pendant l'envoi, `pending` désactive via le `disabled` initial. Vérifier dans le navigateur que le bouton reste bien grisé sans modification.

- [ ] **Step 2: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add components/AdjustWorkoutModal.tsx
git commit -m "Modale « Ajuster la séance » : retraits, ajouts par zone du corps, résumé"
```

---

### Task 11: Historique de douleur (série + courbe SVG)

**Files:**
- Create: `lib/dashboard/painHistory.ts`, `lib/dashboard/painHistory.test.ts`
- Create: `components/PainHistoryChart.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface PainPoint { x: number; y: number; score: number; dateLabel: string }
  export interface PainSeries { points: PainPoint[]; ticks: { x: number; label: string }[]; latest: number | null; previous: number | null }
  export function buildPainSeries(rows: { pain_score: number | null; created_at: string }[], now?: Date, days?: number): PainSeries
  export default function PainHistoryChart({ series }: { series: PainSeries })
  ```

- [ ] **Step 1: Tests**

`lib/dashboard/painHistory.test.ts` :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPainSeries } from "./painHistory.ts";

const now = new Date(2026, 8, 3, 12);
const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

test("points ordonnés dans le temps, x entre 0 et 1, notes nulles ignorées", () => {
  const s = buildPainSeries([
    { pain_score: 7, created_at: at(2) },
    { pain_score: null, created_at: at(1) },
    { pain_score: 4, created_at: at(10) },
    { pain_score: 9, created_at: at(40) }, // hors fenêtre
  ], now);
  assert.deepEqual(s.points.map((p) => p.score), [4, 7]);
  assert.ok(s.points[0].x < s.points[1].x);
  assert.ok(s.points.every((p) => p.x >= 0 && p.x <= 1));
  assert.equal(s.latest, 7);
  assert.equal(s.previous, 4);
});

test("sans note → série vide et latest/previous null", () => {
  const s = buildPainSeries([], now);
  assert.deepEqual(s.points, []);
  assert.equal(s.latest, null);
  assert.equal(s.previous, null);
  assert.equal(s.ticks.length, 6);
});
```

- [ ] **Step 2: Lancer, vérifier l'échec** — Run: `npm test` → module introuvable.

- [ ] **Step 3: Implémenter `lib/dashboard/painHistory.ts`**

```ts
// Série de douleur des 30 derniers jours pour la fiche patient — pur, testé.

export interface PainPoint { x: number; y: number; score: number; dateLabel: string }
export interface PainSeries {
  points: PainPoint[];
  ticks: { x: number; label: string }[];
  latest: number | null;
  previous: number | null;
}

const DAY_FMT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export function buildPainSeries(
  rows: { pain_score: number | null; created_at: string }[],
  now: Date = new Date(),
  days = 30,
): PainSeries {
  const end = now.getTime();
  const start = end - days * 86_400_000;
  const scored = rows
    .filter((r) => r.pain_score != null)
    .map((r) => ({ score: r.pain_score as number, t: new Date(r.created_at).getTime() }))
    .filter((r) => !Number.isNaN(r.t) && r.t >= start && r.t <= end)
    .sort((a, b) => a.t - b.t);

  const points = scored.map((r) => ({
    x: (r.t - start) / (end - start),
    y: r.score,
    score: r.score,
    dateLabel: DAY_FMT.format(new Date(r.t)),
  }));

  const ticks = Array.from({ length: 6 }, (_, i) => {
    const t = start + ((end - start) * i) / 5;
    return { x: i / 5, label: DAY_FMT.format(new Date(t)) };
  });

  const n = scored.length;
  return {
    points,
    ticks,
    latest: n ? scored[n - 1].score : null,
    previous: n > 1 ? scored[n - 2].score : null,
  };
}
```

Run: `npm test` → les 2 tests passent.

- [ ] **Step 4: Créer `components/PainHistoryChart.tsx`**

```tsx
import type { PainSeries } from "@/lib/dashboard/painHistory";

// Courbe SVG maison (pas de librairie) : 0–10 en Y, 30 jours en X.
const W = 320, H = 120, PAD_L = 22, PAD_R = 8, PAD_T = 8, PAD_B = 20;
const px = (x: number) => PAD_L + x * (W - PAD_L - PAD_R);
const py = (y: number) => PAD_T + (1 - y / 10) * (H - PAD_T - PAD_B);

export default function PainHistoryChart({ series }: { series: PainSeries }) {
  if (series.points.length === 0) {
    return <p className="flex h-32 items-center justify-center text-sm text-muted">Pas encore de ressenti transmis.</p>;
  }
  const path = series.points.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" role="img" aria-label="Historique de douleur sur 30 jours">
      {[0, 5, 10].map((v) => (
        <g key={v} className="text-line">
          <line x1={PAD_L} x2={W - PAD_R} y1={py(v)} y2={py(v)} stroke="currentColor" strokeWidth={1} />
          <text x={PAD_L - 6} y={py(v) + 3} textAnchor="end" fontSize={8} className="fill-muted">{v}</text>
        </g>
      ))}
      {series.ticks.map((t) => (
        <text key={t.x} x={px(t.x)} y={H - 6} textAnchor="middle" fontSize={8} className="fill-muted">{t.label}</text>
      ))}
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-danger" />
      {series.points.map((p, i) => (
        <circle key={i} cx={px(p.x)} cy={py(p.y)} r={2.5} fill="currentColor" className="text-danger">
          <title>{p.dateLabel} — douleur {p.score}/10</title>
        </circle>
      ))}
    </svg>
  );
}
```

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add lib/dashboard/painHistory.ts lib/dashboard/painHistory.test.ts components/PainHistoryChart.tsx
git commit -m "Historique de douleur : série 30 jours + courbe SVG"
```

---

### Task 12: Fiche patient — panneau « Patient », calendrier restylé, modale branchée

**Files:**
- Modify: `components/PatientCalendar.tsx` (tokens)
- Create: `components/CalendarPanel.tsx` (remplace `PatientOverviewPanel`)
- Delete: `components/PatientOverviewPanel.tsx`
- Modify: `components/AddWorkoutModal.tsx` (tokens)
- Modify: `app/dashboard/patients/[id]/page.tsx` (réécriture complète)
- Modify: `app/dashboard/seances/page.tsx:54-58` (filtre `patient_id is null`)

**Interfaces:**
- Consumes: `AdjustWorkoutModal` + `adjustPatientWorkout` (Tâches 9–10), `PainHistoryChart` + `buildPainSeries` (Tâche 11), `computeAdherence`/`adherenceLabel`/`adherenceTone`, `relativeDay`, `STAGE_SHORT`/`STAGE_LABELS`, `pickActiveWorkout`, `gradeDay`, `resolveMonthInfo`, `computeStreak`, `AddWorkoutModal`.
- Produces: `CalendarPanel(props: PatientCalendarProps minus selectedDay/onSelectDay)` — gère la sélection et affiche le détail du jour sous le calendrier.

- [ ] **Step 1: Tokens dans `components/PatientCalendar.tsx`**

Remplacer les trois tables de style par :

```ts
const GRADE_STYLE: Record<DayGrade, string> = {
  green: "cursor-pointer bg-ok-soft text-ok hover:brightness-95",
  yellow: "cursor-pointer bg-warn-soft text-warn hover:brightness-95",
  red: "cursor-pointer bg-danger-soft text-danger hover:brightness-95",
  grey: "bg-app-bg text-muted",
};
const GRADE_DOT: Record<DayGrade, string> = { green: "bg-ok", yellow: "bg-warn", red: "bg-danger", grey: "bg-line" };
```

Et dans le JSX : `<section className="rounded-2xl border border-[color:var(--hairline)] bg-white p-6">` → `<section className="rounded-xl border border-line bg-surface p-5">` ; `<h2 className="font-display text-xl font-semibold text-[color:var(--ink)]">` → `<h2 className="text-sm font-semibold text-ink">` ; `text-[color:var(--ink-soft)]` et `text-[color:var(--ink-muted)]` → `text-muted` ; `hover:bg-black/5` → `hover:bg-app-bg` ; `outline-[color:var(--ink-accent)]` → `outline-brand` (deux occurrences dans les liens + une dans le bouton) ; `ring-[color:var(--ink)]` → `ring-ink`. Aucune variable `--…` ne doit subsister : `grep -n "var(--" components/PatientCalendar.tsx` → vide.

- [ ] **Step 2: Créer `components/CalendarPanel.tsx`**

```tsx
"use client";

import { useState } from "react";
import PatientCalendar, { type CalendarDay } from "@/components/PatientCalendar";
import type { DayGrade } from "@/lib/exercise/dayGrade";

const DETAIL_TONE: Record<DayGrade, string> = {
  green: "bg-ok-soft text-ok",
  yellow: "bg-warn-soft text-warn",
  red: "bg-danger-soft text-danger",
  grey: "bg-app-bg text-muted",
};

export default function CalendarPanel(props: {
  monthLabel: string;
  prevMonthKey: string;
  nextMonthKey: string;
  leadingBlanks: number;
  days: CalendarDay[];
  todayDay: number | null;
}) {
  const [selected, setSelected] = useState<CalendarDay | null>(null);
  const monthWord = props.monthLabel.split(" ")[0].toLowerCase();
  return (
    <div>
      <PatientCalendar {...props} selectedDay={selected?.day ?? null} onSelectDay={setSelected} />
      {selected && (
        <div className={`mt-3 rounded-xl px-4 py-3 text-sm ${DETAIL_TONE[selected.grade]}`}>
          <p className="font-semibold">{selected.day} {monthWord}</p>
          <p className="mt-0.5">{selected.detail ?? "Pas de séance ce jour-là."}</p>
        </div>
      )}
    </div>
  );
}
```

Puis `git rm components/PatientOverviewPanel.tsx`.

- [ ] **Step 3: Tokens dans `components/AddWorkoutModal.tsx`**

Remplacements (tous, avec `replace_all`) : `bg-[color:var(--paper)]` → `bg-surface` ; `text-[color:var(--ink)]` → `text-ink` ; `text-[color:var(--ink-soft)]` et `text-[color:var(--ink-muted)]` → `text-muted` ; `border-[color:var(--hairline)]` et `divide-[color:var(--hairline)]` → `border-line` / `divide-line` ; `text-[color:var(--ink-accent)]` → `text-brand` ; `border-[color:var(--ink-accent)]` → `border-brand` ; `bg-[#2B2622]/45` (ou équivalent du voile) → `bg-ink/45` ; `hover:bg-[color:var(--grade-red-bg)]` → `hover:bg-danger-soft` ; `hover:text-[color:var(--grade-red-fg)]` → `hover:text-danger` ; `rounded-3xl` du panneau → `rounded-2xl` ; `shadow-2xl`/`shadow-xl` → `shadow-sm`. Contrôle : `grep -n "var(--" components/AddWorkoutModal.tsx` → vide.

- [ ] **Step 4: Filtre des copies dans « Mes séances »**

Dans `app/dashboard/seances/page.tsx`, la requête `mine` (≈ lignes 54–58) devient :

```ts
  const { data: mine } = await supabase
    .from("workouts")
    .select("id, name, stage, condition_id, workout_exercises(position, exercise:exercises(name))")
    .eq("created_by", user.id)
    .is("patient_id", null)
    .order("created_at", { ascending: false });
```

- [ ] **Step 5: Réécrire `app/dashboard/patients/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronUp, Dumbbell, FileText, Flame, MessageCircle, Minus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { startOfWeekISO, resolveMonthInfo } from "@/lib/week";
import { gradeDay } from "@/lib/exercise/dayGrade";
import { pickActiveWorkout } from "@/lib/exercise/activeRecommendation";
import { computeStreak } from "@/lib/exercise/streak";
import { computeAdherence, adherenceLabel, adherenceTone } from "@/lib/exercise/adherence";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import { relativeDay } from "@/lib/format/relativeDay";
import { STAGE_LABELS, STAGE_SHORT, type InjuryStage } from "@/lib/exercise/prescription";
import { ageFromDob } from "@/lib/exercise/patientProfile";
import { type CalendarDay } from "@/components/PatientCalendar";
import CalendarPanel from "@/components/CalendarPanel";
import PainHistoryChart from "@/components/PainHistoryChart";
import AdjustWorkoutModal from "@/components/AdjustWorkoutModal";
import AddWorkoutModal, { type AddableWorkout } from "@/components/AddWorkoutModal";
import { assignCondition, addRecommendedWorkout, removeRecommendedWorkout, moveRecommendedWorkout, sendMessage, adjustPatientWorkout } from "./actions";

type WorkoutExercise = { position: number; exercises: { id: string; name: string } | null };
type Workout = {
  id: string; name: string; description: string | null; duration_minutes: number | null; times_per_week: number | null;
  stage: string | null; created_by: string | null; condition_id: string | null; patient_id: string | null;
  workout_exercises: WorkoutExercise[];
};

const ACTIVITY_LABELS: Record<string, string> = { sedentary: "Sédentaire", moderate: "Modérée", active: "Active" };
const TONE_TEXT = { ok: "text-ok", warn: "text-warn", danger: "text-danger", muted: "text-muted" } as const;
const TONE_BG = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger", muted: "bg-app-bg text-muted" } as const;

function PainDelta({ latest, previous }: { latest: number | null; previous: number | null }) {
  if (latest === null || previous === null) return <span className="text-xs text-muted">—</span>;
  const d = latest - previous;
  if (d === 0) return <span className="flex items-center gap-1 text-xs text-muted"><Minus className="h-3 w-3" strokeWidth={2} />= séance précédente</span>;
  return (
    <span className={`flex items-center gap-1 text-xs ${d > 0 ? "text-danger" : "text-ok"}`}>
      {d > 0 ? <ArrowUp className="h-3 w-3" strokeWidth={2} /> : <ArrowDown className="h-3 w-3" strokeWidth={2} />}
      {Math.abs(d)} depuis la séance précédente
    </span>
  );
}

export default async function PatientDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; month?: string; adjusted?: string }> }) {
  const { id } = await params;
  const { error, month: monthParam, adjusted } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const now = new Date();

  const { data: patient } = await supabase.from("patients").select("id, full_name, email, condition_id").eq("id", id).maybeSingle();
  if (!patient) redirect("/dashboard/patients");
  const firstName = ((patient.full_name as string | null) ?? "").split(" ")[0] || "ce patient";

  const WORKOUT_FIELDS = "id, name, description, duration_minutes, times_per_week, stage, created_by, condition_id, patient_id, workout_exercises ( position, exercises ( id, name ) )";
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const month = resolveMonthInfo(monthParam);

  const [
    { data: conditions }, { data: messages }, { data: profile }, { data: docs }, { data: allLogs }, { data: recentFeedback },
    { data: monthLogs }, { data: ownWorkouts }, { data: platformWorkouts }, { data: recRows }, { data: allExercises }, { data: hiddenRows },
  ] = await Promise.all([
    supabase.from("conditions").select("id, name").order("name"),
    supabase.from("patient_messages").select("id, body, created_at, read_at, read_by_instructor_at, sender").eq("patient_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("patient_profiles").select("condition_id, injury_stage, rehab_progress, history, date_of_birth, height_cm, weight_kg, activity_level, updated_at").eq("id", id).maybeSingle(),
    supabase.from("patient_documents").select("id, file_name, storage_path, uploaded_at").eq("patient_id", id).order("uploaded_at", { ascending: false }),
    supabase.from("workout_logs").select("id, completed_at, workout_id").eq("patient_id", id),
    supabase.from("patient_feedback").select("pain_score, created_at").eq("patient_id", id).gte("created_at", since30),
    supabase.from("workout_logs").select("id, completed_at, workouts ( name )").eq("patient_id", id).gte("completed_at", month.startISO).lt("completed_at", month.endISO),
    supabase.from("workouts").select(WORKOUT_FIELDS).eq("created_by", user.id),
    supabase.from("workouts").select(WORKOUT_FIELDS).is("created_by", null),
    supabase.from("patient_recommended_workouts").select("id, priority, workout_id, created_at").eq("patient_id", id).order("priority"),
    supabase.from("exercises").select("id, name").order("name"),
    supabase.from("instructor_hidden_exercises").select("exercise_id").eq("instructor_id", user.id),
  ]);

  const unreadFromPatient = (messages ?? []).filter((m) => m.sender === "patient" && !m.read_by_instructor_at);
  if (unreadFromPatient.length > 0) {
    await supabase.from("patient_messages").update({ read_by_instructor_at: new Date().toISOString() }).eq("patient_id", id).eq("instructor_id", user.id).eq("sender", "patient").is("read_by_instructor_at", null);
  }

  const conditionName = (cid: string | null) => conditions?.find((c) => c.id === cid)?.name;
  const stage = (profile?.injury_stage as InjuryStage | null) ?? null;

  // Séances : les miennes (hors copies d'autres patients), la plateforme, et les copies de CE patient.
  const own = (ownWorkouts ?? []) as unknown as Workout[];
  const pool = [...own.filter((w) => w.patient_id === null), ...((platformWorkouts ?? []) as unknown as Workout[])];
  const copies = own.filter((w) => w.patient_id === id);
  const workoutById = new Map([...pool, ...copies].map((w) => [w.id, w]));

  const recommended = (recRows ?? [])
    .map((r) => ({ recId: r.id as string, priority: r.priority as number, createdAt: r.created_at as string, workout: workoutById.get(r.workout_id as string) }))
    .filter((r): r is { recId: string; priority: number; createdAt: string; workout: Workout } => r.workout != null);

  const weekStart = startOfWeekISO();
  const weekCount: Record<string, number> = {};
  for (const l of allLogs ?? []) if ((l.completed_at as string) >= weekStart) weekCount[l.workout_id as string] = (weekCount[l.workout_id as string] ?? 0) + 1;
  const activeWorkoutId = pickActiveWorkout(recommended.map((r) => ({ workoutId: r.workout.id, priority: r.priority, timesPerWeek: r.workout.times_per_week })), weekCount);
  const active = recommended.find((r) => r.workout.id === activeWorkoutId)?.workout ?? null;
  const activeExercises = active ? [...active.workout_exercises].sort((a, b) => a.position - b.position).map((we) => we.exercises).filter((e): e is { id: string; name: string } => !!e) : [];

  // Stats.
  const completed = (allLogs ?? []).map((l) => l.completed_at as string);
  const totalSessions = completed.length;
  const streak = computeStreak(completed);
  const lastLog = (allLogs ?? []).reduce<{ completed_at: string; workout_id: string } | null>((best, l) => (!best || (l.completed_at as string) > best.completed_at ? { completed_at: l.completed_at as string, workout_id: l.workout_id as string } : best), null);
  const lastWorkout = lastLog ? workoutById.get(lastLog.workout_id) : undefined;
  const adherence = computeAdherence({ completedAt: completed, recommendations: recommended.map((r) => ({ timesPerWeek: r.workout.times_per_week, createdAt: r.createdAt })), now });
  const tone = adherenceTone(adherence.pct);
  const pain = buildPainSeries((recentFeedback ?? []) as { pain_score: number | null; created_at: string }[], now);

  // Calendrier (inchangé : couleur = pire ressenti du jour).
  const monthLogIds = (monthLogs ?? []).map((l) => l.id as string);
  const { data: monthFeedback } = monthLogIds.length ? await supabase.from("patient_feedback").select("workout_log_id, pain_score, difficulty, notes").in("workout_log_id", monthLogIds) : { data: [] };
  const feedbackByLogId = new Map((monthFeedback ?? []).filter((f) => f.workout_log_id).map((f) => [f.workout_log_id as string, f]));
  const logsByDay = new Map<number, { id: string; workoutName: string | null; time: string }[]>();
  for (const l of monthLogs ?? []) {
    const d = new Date(l.completed_at as string);
    const entry = { id: l.id as string, workoutName: (l.workouts as unknown as { name: string } | null)?.name ?? null, time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) };
    (logsByDay.get(d.getDate()) ?? logsByDay.set(d.getDate(), []).get(d.getDate())!).push(entry);
  }
  const calendarDays: CalendarDay[] = Array.from({ length: month.daysInMonth }, (_, i) => {
    const day = i + 1;
    const logs = logsByDay.get(day) ?? [];
    const grade = gradeDay(logs.length > 0, logs.map((l) => { const f = feedbackByLogId.get(l.id); return { painScore: (f?.pain_score as number | null) ?? null, difficulty: (f?.difficulty as number | null) ?? null }; }));
    const detail = logs.length
      ? logs.map((l) => { const f = feedbackByLogId.get(l.id); const parts = [l.workoutName ?? "Séance", `terminée à ${l.time}`]; if (f?.pain_score != null) parts.push(`douleur ${f.pain_score}/10`); if (f?.difficulty != null) parts.push(`difficulté ${f.difficulty}/10`); if (f?.notes) parts.push(`« ${f.notes} »`); return parts.join(" · "); }).join(" ; ")
      : null;
    return { day, grade, detail };
  });

  // Modale « Ajuster » : exercices ajoutables = tous − masqués − déjà dans la séance.
  const hiddenIds = new Set((hiddenRows ?? []).map((r) => r.exercise_id as string));
  const inActive = new Set(activeExercises.map((e) => e.id));
  const addableExercises = (allExercises ?? []).filter((e) => !hiddenIds.has(e.id) && !inActive.has(e.id)).map((e) => ({ id: e.id as string, name: e.name as string }));

  // Modale « Ajouter une séance » : le pool sans les séances déjà recommandées.
  const recommendedIds = new Set(recommended.map((r) => r.workout.id));
  const stageOrder = new Map(Object.keys(STAGE_LABELS).map((s, i) => [s, i]));
  const addableWorkouts: AddableWorkout[] = pool
    .filter((w) => !recommendedIds.has(w.id))
    .sort((a, b) => (conditionName(a.condition_id) ?? "").localeCompare(conditionName(b.condition_id) ?? "", "fr") || (stageOrder.get(a.stage ?? "") ?? 99) - (stageOrder.get(b.stage ?? "") ?? 99))
    .map((w) => ({ id: w.id, name: w.name, description: w.description, durationMinutes: w.duration_minutes, timesPerWeek: w.times_per_week, stageLabel: w.stage ? STAGE_LABELS[w.stage as InjuryStage] : null, conditionName: conditionName(w.condition_id) ?? null, editHref: w.created_by === user.id ? `/dashboard/seances/${w.id}` : null, exerciseNames: [...w.workout_exercises].sort((a, b) => a.position - b.position).map((we) => we.exercises?.name).filter((n): n is string => !!n) }));

  const docLinks: { id: string; file_name: string; url: string | null }[] = [];
  for (const d of docs ?? []) {
    const { data } = await supabase.storage.from("patient-documents").createSignedUrl(d.storage_path, 3600);
    docLinks.push({ id: d.id, file_name: d.file_name, url: data?.signedUrl ?? null });
  }
  const profileUpdated = profile?.updated_at ? new Date(profile.updated_at as string).toLocaleDateString("fr-FR") : null;

  const inputClass = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft";

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <Link href="/dashboard/patients" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} />Retour à la liste</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{patient.full_name}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {conditionName(patient.condition_id) ?? "Condition non assignée"}
              {stage && <> · <span title={STAGE_LABELS[stage]}>{STAGE_SHORT[stage]}</span></>}
              <span className="ml-3 inline-flex items-center gap-1 text-xs"><Flame className="h-3.5 w-3.5" strokeWidth={1.75} />{streak} j d&apos;affilée · {totalSessions} séance{totalSessions > 1 ? "s" : ""}</span>
            </p>
          </div>
          <AdjustWorkoutModal patientId={patient.id} patientFirstName={firstName} workout={active ? { id: active.id, name: active.name, exercises: activeExercises } : null} addable={addableExercises} action={adjustPatientWorkout} />
        </div>

        {error && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
        {adjusted === "1" && <p className="mt-4 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok"><CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />Séance ajustée — le patient a été prévenu.</p>}

        {/* Trois stats */}
        <div className="mt-6 grid divide-y divide-line rounded-xl border border-line bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-4">
            <p className="text-xs font-medium text-muted">Douleur</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${pain.latest !== null && pain.latest >= 6 ? "text-danger" : "text-ink"}`}>{pain.latest !== null ? `${pain.latest}/10` : "—"}</p>
            <div className="mt-1"><PainDelta latest={pain.latest} previous={pain.previous} /></div>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-muted">Adhérence</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{adherence.pct !== null ? `${adherence.pct} %` : "—"}</p>
            {adherenceLabel(adherence.pct) && <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE_BG[tone]}`}>{adherenceLabel(adherence.pct)}</span>}
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-muted">Dernière séance</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{relativeDay(lastLog?.completed_at ?? null, now)}</p>
            {lastWorkout && <p className="mt-1 text-xs text-muted">{lastWorkout.duration_minutes ?? "—"} min · {lastWorkout.workout_exercises.length} exercice{lastWorkout.workout_exercises.length > 1 ? "s" : ""}</p>}
          </div>
        </div>

        {/* Calendrier + douleur */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <CalendarPanel monthLabel={month.label} prevMonthKey={month.prevMonthKey} nextMonthKey={month.nextMonthKey} leadingBlanks={month.leadingBlanks} days={calendarDays} todayDay={month.todayDay} />
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Historique douleur</h2>
            <p className="mt-1 text-sm text-muted">Notes transmises en fin de séance, 30 derniers jours.</p>
            <div className="mt-3"><PainHistoryChart series={pain} /></div>
          </section>
        </div>

        {/* Séance recommandée + liste */}
        <section className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Séance recommandée</h2>
          {active ? (
            <div className="mt-3">
              <p className="text-base font-semibold text-ink">{active.name}</p>
              <p className="text-sm text-muted">{active.duration_minutes} min · {active.times_per_week ? `${active.times_per_week}×/semaine` : "objectif libre"} · cette semaine {weekCount[active.id] ?? 0}{active.times_per_week ? `/${active.times_per_week}` : ""}</p>
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                {activeExercises.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm text-ink">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><Dumbbell className="h-3.5 w-3.5" strokeWidth={1.75} /></span>
                    {e.name}
                  </li>
                ))}
                {activeExercises.length === 0 && <li className="px-3 py-2 text-sm text-muted">Cette séance ne contient pas encore d&apos;exercices.</li>}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">{recommended.length ? "Toutes les séances recommandées sont faites cette semaine." : "Aucune séance recommandée pour l'instant — ajoutez-en une ci-dessous."}</p>
          )}

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Autres séances recommandées</h3>
          <ul className="mt-2 divide-y divide-line">
            {recommended.map((r, i) => (
              <li key={r.recId} className={`flex items-start gap-3 py-3 ${r.workout.id === activeWorkoutId ? "-mx-3 rounded-lg bg-brand-soft/60 px-3" : ""}`}>
                <span className="w-5 text-sm font-semibold tabular-nums text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  {r.workout.created_by === user.id && r.workout.patient_id === null
                    ? <Link href={`/dashboard/seances/${r.workout.id}`} className="truncate text-sm font-semibold text-ink underline decoration-line underline-offset-2 hover:decoration-brand">{r.workout.name}</Link>
                    : <p className="truncate text-sm font-semibold text-ink">{r.workout.name}{r.workout.patient_id === id && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">Séance de {firstName}</span>}</p>}
                  <p className="text-xs text-muted">{r.workout.duration_minutes} min · {r.workout.times_per_week ? `${r.workout.times_per_week}×/semaine` : "objectif libre"} · cette semaine {weekCount[r.workout.id] ?? 0}{r.workout.times_per_week ? `/${r.workout.times_per_week}` : ""}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <form action={moveRecommendedWorkout}><input type="hidden" name="patient_id" value={patient.id} /><input type="hidden" name="rec_id" value={r.recId} /><input type="hidden" name="direction" value="up" /><button type="submit" disabled={i === 0} aria-label="Monter" className="rounded p-1 text-muted hover:bg-app-bg hover:text-ink disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" strokeWidth={2} /></button></form>
                  <form action={moveRecommendedWorkout}><input type="hidden" name="patient_id" value={patient.id} /><input type="hidden" name="rec_id" value={r.recId} /><input type="hidden" name="direction" value="down" /><button type="submit" disabled={i === recommended.length - 1} aria-label="Descendre" className="rounded p-1 text-muted hover:bg-app-bg hover:text-ink disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" strokeWidth={2} /></button></form>
                  <form action={removeRecommendedWorkout}><input type="hidden" name="patient_id" value={patient.id} /><input type="hidden" name="rec_id" value={r.recId} /><button type="submit" aria-label="Retirer" className="rounded p-1 text-muted hover:bg-danger-soft hover:text-danger"><X className="h-3.5 w-3.5" strokeWidth={2} /></button></form>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3"><AddWorkoutModal patientId={patient.id} addable={addableWorkouts} addAction={addRecommendedWorkout} /></div>
        </section>

        {/* Messages */}
        <section className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink"><MessageCircle className="h-4 w-4 text-muted" strokeWidth={1.75} />Messages</h2>
          {messages && messages.length > 0 && (
            <ul className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto">
              {[...messages].reverse().map((m) => {
                const mine = m.sender === "instructor";
                return (
                  <li key={m.id as string} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-app-bg text-ink"}`}>
                      <p>{m.body as string}</p>
                      <p className={`mt-0.5 text-xs ${mine ? "text-white/70" : "text-muted"}`}>{new Date(m.created_at as string).toLocaleString("fr-FR")}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <form action={sendMessage} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="patient_id" value={patient.id} />
            <textarea name="body" required rows={2} placeholder="Écrire un message…" className={`flex-1 ${inputClass}`} />
            <button type="submit" className="self-end rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:self-auto">Envoyer</button>
          </form>
        </section>

        {/* Condition & situation déclarée */}
        <details className="mt-6 rounded-xl border border-line bg-surface p-5">
          <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
            Condition &amp; situation déclarée <span className="ml-2 text-sm font-normal text-muted">{conditionName(patient.condition_id) ?? "Aucune condition assignée"}</span>
          </summary>
          <form action={assignCondition} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="patient_id" value={patient.id} />
            <select name="condition_id" defaultValue={patient.condition_id ?? ""} required className={`flex-1 ${inputClass}`}>
              <option value="" disabled>Choisir une condition…</option>
              {conditions?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="submit" className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Assigner</button>
          </form>
          {profile ? (
            <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-ink">
              <p><span className="text-muted">Ce que le patient déclare :</span> <span className="font-medium">{conditionName(profile.condition_id as string | null) ?? "—"}</span>{stage && <span className="text-muted"> · {STAGE_LABELS[stage]}</span>}</p>
              <p><span className="text-muted">Profil :</span> {ageFromDob(profile.date_of_birth as string | null) ?? "—"} ans · {profile.height_cm ?? "—"} cm · {profile.weight_kg ?? "—"} kg · activité {ACTIVITY_LABELS[(profile.activity_level as string) ?? ""] ?? "—"}</p>
              {profile.rehab_progress && <p><span className="text-muted">Avancement{profileUpdated ? ` (mis à jour le ${profileUpdated})` : ""} :</span> {profile.rehab_progress as string}</p>}
              {profile.history && <p><span className="text-muted">Historique :</span> {profile.history as string}</p>}
            </div>
          ) : (
            <p className="mt-4 border-t border-line pt-4 text-sm text-muted">Le patient n&apos;a pas encore complété son admission.</p>
          )}
          {docLinks.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-medium text-ink">Documents médicaux</p>
              <ul className="mt-2 space-y-1.5">
                {docLinks.map((d) => (
                  <li key={d.id}>
                    {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"><FileText className="h-4 w-4 shrink-0" strokeWidth={1.75} />{d.file_name}</a>
                           : <span className="flex items-center gap-1.5 text-sm text-muted"><FileText className="h-4 w-4 shrink-0" strokeWidth={1.75} />{d.file_name}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Typecheck, lint, vérification**

Run: `npx tsc --noEmit && npm run lint && grep -rn "rehab-panel\|var(--ink\|var(--hairline\|var(--grade" app components` → aucune occurrence.
Dans le navigateur, fiche d'un patient : en-tête + bouton « Ajuster la séance », 3 stats, calendrier + courbe, séance recommandée avec ses exercices, liste ordonnée, messages, bloc replié. Cliquer « Ajuster la séance », retirer un exercice, en ajouter un, enregistrer → bandeau vert, liste marquée « Séance de {Prénom} », message automatique visible dans le fil. Côté patient (`/patient/seance-du-jour`) : la séance ajustée apparaît avec les nouveaux exercices. (Nécessite la migration 0042 appliquée.)

- [ ] **Step 7: Commit**

```bash
git add components/PatientCalendar.tsx components/CalendarPanel.tsx components/AddWorkoutModal.tsx "app/dashboard/patients/[id]/page.tsx" app/dashboard/seances/page.tsx
git commit -m "Fiche patient : stats, historique douleur, séance recommandée, modale d'ajustement branchée"
```

---

### Task 13: Page d'accueil — section « Côté kiné » avec démo 3 panneaux

**Files:**
- Create: `components/KineJourneyDemo.tsx`
- Modify: `app/page.tsx:152-193` (section « Côté praticien ») et ses imports
- Modify: `components/KineDemoScreens.tsx` (ne garder que `Cursor` ; `useReducedMotion` vit dans `PhoneDemoScreens.tsx`)
- Delete: `components/KineDemoMockup.tsx`

**Interfaces:**
- Consumes: `Cursor({ stageEl, targetEl, clicking })` (`components/KineDemoScreens.tsx`), `useReducedMotion()` (`components/PhoneDemoScreens.tsx`), `useInView` (`motion/react`).
- Produces: `KineJourneyDemo()` — composant client autonome.

Le site vitrine garde sa palette slate et `font-display` ; **à l'intérieur des trois panneaux**, on utilise les tokens de l'app (ils imitent les vrais écrans).

- [ ] **Step 1: Réduire `components/KineDemoScreens.tsx` à `Cursor`**

Supprimer tout sauf les imports nécessaires et la fonction `Cursor` (lignes 78–132 actuelles) ; retirer `useKineDemo`, `PHASES`, `DashboardScreen`, `PatientDetailScreen`, `KineDemoBody`, les constantes `PATIENTS`, `WEEK_BARS`, `CAL_*`, `PICKABLE_EXERCISES`. En-tête de fichier :

```tsx
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MousePointer2 } from "lucide-react";
```

(`Cursor` inchangé.) Puis `git rm components/KineDemoMockup.tsx`.

- [ ] **Step 2: Créer `components/KineJourneyDemo.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { ArrowRight, Bell, Check, CheckCircle2, ChevronRight, Dumbbell, Lightbulb, Plus, Search, Smartphone, X } from "lucide-react";
import { Cursor } from "@/components/KineDemoScreens";
import { useReducedMotion } from "@/components/PhoneDemoScreens";

// Trois panneaux côte à côte = les trois vrais écrans (tableau de bord,
// fiche patient, modale d'ajustement), simplifiés. Un curseur enchaîne :
// clic Marc T. → panneau 2 s'allume → clic « Ajuster la séance » →
// panneau 3 → clic « Squat assisté » (à retirer) → clic « Enregistrer »
// → résumé + bandeau. Boucle ≈ 12 s. Reduced-motion : tout allumé, sans curseur.
type Target = "marc" | "adjust" | "squat" | "save" | null;
type Phase = { target: Target; clicking: boolean; lit2: boolean; lit3: boolean; marcHi: boolean; squatOut: boolean; saved: boolean; duration: number };

const PHASES: Phase[] = [
  { target: null,     clicking: false, lit2: false, lit3: false, marcHi: false, squatOut: false, saved: false, duration: 1200 },
  { target: "marc",   clicking: false, lit2: false, lit3: false, marcHi: false, squatOut: false, saved: false, duration: 700 },
  { target: "marc",   clicking: true,  lit2: false, lit3: false, marcHi: true,  squatOut: false, saved: false, duration: 500 },
  { target: null,     clicking: false, lit2: true,  lit3: false, marcHi: true,  squatOut: false, saved: false, duration: 1300 },
  { target: "adjust", clicking: false, lit2: true,  lit3: false, marcHi: true,  squatOut: false, saved: false, duration: 700 },
  { target: "adjust", clicking: true,  lit2: true,  lit3: false, marcHi: true,  squatOut: false, saved: false, duration: 500 },
  { target: null,     clicking: false, lit2: true,  lit3: true,  marcHi: true,  squatOut: false, saved: false, duration: 1100 },
  { target: "squat",  clicking: false, lit2: true,  lit3: true,  marcHi: true,  squatOut: false, saved: false, duration: 700 },
  { target: "squat",  clicking: true,  lit2: true,  lit3: true,  marcHi: true,  squatOut: true,  saved: false, duration: 600 },
  { target: "save",   clicking: false, lit2: true,  lit3: true,  marcHi: true,  squatOut: true,  saved: false, duration: 800 },
  { target: "save",   clicking: true,  lit2: true,  lit3: true,  marcHi: true,  squatOut: true,  saved: true,  duration: 500 },
  { target: null,     clicking: false, lit2: true,  lit3: true,  marcHi: true,  squatOut: true,  saved: true,  duration: 2500 },
];

const STATIC: Phase = { target: null, clicking: false, lit2: true, lit3: true, marcHi: true, squatOut: true, saved: true, duration: 0 };

function PanelTitle({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-ink">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">{n}</span>
      <span className="font-semibold">{title}</span>
      <span className="text-muted">— {sub}</span>
    </p>
  );
}

function Initials({ text, tone }: { text: string; tone: "brand" | "ok" | "warn" | "danger" }) {
  const cls = { brand: "bg-brand-soft text-brand", ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-surface text-danger" }[tone];
  return <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${cls}`}>{text}</span>;
}

export default function KineJourneyDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: false });
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!inView || reduced) return;
    const t = setTimeout(() => setI((k) => (k + 1) % PHASES.length), PHASES[i].duration);
    return () => clearTimeout(t);
  }, [inView, reduced, i]);
  const ph = reduced ? STATIC : PHASES[i];

  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [marcEl, setMarcEl] = useState<HTMLElement | null>(null);
  const [adjustEl, setAdjustEl] = useState<HTMLElement | null>(null);
  const [squatEl, setSquatEl] = useState<HTMLElement | null>(null);
  const [saveEl, setSaveEl] = useState<HTMLElement | null>(null);
  const targetEl = ph.target === "marc" ? marcEl : ph.target === "adjust" ? adjustEl : ph.target === "squat" ? squatEl : ph.target === "save" ? saveEl : null;

  const panel = (lit: boolean) => `rounded-2xl border border-line bg-surface p-4 transition-opacity duration-500 ${lit ? "opacity-100" : "opacity-45"}`;

  return (
    <div ref={ref} className="rounded-[2rem] border border-slate-200/70 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white">Démo interactive</span>
        <span className="text-sm text-slate-500">Regardez le parcours, du tableau de bord à l&apos;ajustement.</span>
      </div>

      <div ref={setStage} className="relative mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch" aria-hidden>
        {/* 1 — Tableau de bord */}
        <div className={panel(true)}>
          <PanelTitle n={1} title="Dashboard" sub="Ce qui compte aujourd'hui" />
          <div className="mt-3 flex items-center justify-between"><p className="text-sm font-semibold text-ink">Bonjour Julien</p><span className="text-[11px] text-muted">Mercredi 3 septembre</span></div>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {[["8", "Séances faites", "text-ok"], ["2", "Douleurs signalées", "text-danger"], ["1", "Sans activité", "text-warn"], ["12", "Patients suivis", "text-ink"]].map(([v, l, c]) => (
              <div key={l} className="rounded-lg border border-line p-1.5"><p className={`text-base font-semibold tabular-nums ${c}`}>{v}</p><p className="text-[9px] leading-tight text-muted">{l}</p></div>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-semibold text-ink">À traiter aujourd&apos;hui</p>
          <div ref={setMarcEl} className={`mt-1.5 flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors duration-300 ${ph.marcHi ? "border-danger/30 bg-danger-soft" : "border-danger-soft bg-danger-soft/60"}`}>
            <Initials text="MT" tone="danger" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink">Marc T.</span><span className="block text-[10px] text-danger">Douleur signalée</span></span><span className="text-xs font-semibold text-danger">5/10</span><ChevronRight className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
          </div>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line px-2 py-1.5"><Initials text="SR" tone="warn" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink">Sophie R.</span><span className="block text-[10px] text-warn">Aucune séance depuis 4 jours</span></span><ChevronRight className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} /></div>
          <p className="mt-3 text-[11px] font-semibold text-ink">Activité récente</p>
          {[["PM", "Paul M.", "Aujourd'hui"], ["JL", "Julie L.", "Hier"], ["CD", "Claire D.", "Hier"]].map(([ini, n, w]) => (
            <div key={n} className="mt-1 flex items-center gap-2 px-1 py-1"><Initials text={ini} tone="ok" /><span className="flex-1 truncate text-[11px] text-ink"><b className="font-semibold">{n}</b> a terminé sa séance</span><span className="text-[10px] text-muted">{w}</span></div>
          ))}
        </div>

        <ArrowRight className="hidden h-5 w-5 self-center text-blue-300 lg:block" strokeWidth={1.75} />

        {/* 2 — Fiche patient */}
        <div className={panel(ph.lit2)}>
          <PanelTitle n={2} title="Patient" sub="Comprendre le suivi" />
          <div className="mt-3 flex items-start justify-between gap-2">
            <div><p className="text-sm font-semibold text-ink">Marc T.</p><p className="text-[11px] text-muted">Prothèse genou · Phase 1</p></div>
            <span ref={setAdjustEl} className="rounded-full bg-brand px-3 py-1.5 text-[11px] font-medium text-white">Ajuster la séance</span>
          </div>
          <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-lg border border-line text-center">
            <div className="p-2"><p className="text-[9px] text-muted">Douleur</p><p className="text-sm font-semibold text-danger">5/10</p><p className="text-[9px] text-danger">↑2 depuis hier</p></div>
            <div className="p-2"><p className="text-[9px] text-muted">Adhérence</p><p className="text-sm font-semibold text-ink">82 %</p><span className="rounded-full bg-ok-soft px-1.5 text-[9px] text-ok">Bonne</span></div>
            <div className="p-2"><p className="text-[9px] text-muted">Dernière séance</p><p className="text-sm font-semibold text-ink">Aujourd&apos;hui</p><p className="text-[9px] text-muted">15 min · 3 exercices</p></div>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-ink">Calendrier</p>
          <div className="mt-1.5 grid grid-cols-7 gap-1">
            {[["L", "ok"], ["M", "ok"], ["M", "muted"], ["J", "ok"], ["V", "danger"], ["S", "muted"], ["D", "muted"]].map(([d, t], k) => (
              <span key={k} className={`flex aspect-square items-center justify-center rounded-full text-[9px] font-semibold ${t === "ok" ? "bg-ok-soft text-ok" : t === "danger" ? "bg-danger-soft text-danger" : "bg-app-bg text-muted"}`}>{d}</span>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-semibold text-ink">Séance recommandée</p>
          <p className="text-xs font-semibold text-ink">Initiation genou <span className="font-normal text-muted">· 15 min · 3 exercices</span></p>
          <ul className="mt-1.5 divide-y divide-line rounded-lg border border-line">
            {["Extension du genou assise", "Montée de marche", "Squat assisté"].map((e) => (
              <li key={e} className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-ink"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-brand"><Dumbbell className="h-3 w-3" strokeWidth={1.75} /></span>{e}</li>
            ))}
          </ul>
        </div>

        <ArrowRight className="hidden h-5 w-5 self-center text-blue-300 lg:block" strokeWidth={1.75} />

        {/* 3 — Ajuster */}
        <div className={panel(ph.lit3)}>
          <PanelTitle n={3} title="Action" sub="Ajuster en deux clics" />
          <p className="mt-3 text-sm font-semibold text-ink">Ajuster la séance</p>
          <p className="text-[11px] text-muted">Initiation genou — les modifications ne concernent que Marc.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">Exercices actuels</p>
              {["Extension du genou assise", "Montée de marche"].map((e) => (
                <div key={e} className="mt-1 flex items-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-[10px] text-ink"><span className="flex-1 truncate">{e}</span><Check className="h-3 w-3 text-brand" strokeWidth={2} /></div>
              ))}
              <div ref={setSquatEl} className={`mt-1 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] transition-colors duration-300 ${ph.squatOut ? "border-danger-soft bg-danger-soft text-danger" : "border-line text-ink"}`}>
                <span className="flex-1 truncate">Squat assisté</span>{ph.squatOut ? <span className="flex items-center gap-0.5 font-medium">À retirer <X className="h-3 w-3" strokeWidth={2} /></span> : <Check className="h-3 w-3 text-brand" strokeWidth={2} />}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">Ajouter un exercice</p>
              <div className="mt-1 flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-[10px] text-muted"><Search className="h-3 w-3" strokeWidth={1.75} />Rechercher…</div>
              {[["Fente statique", false], ["Pont fessier", ph.saved || ph.squatOut], ["Extension ischio debout", false]].map(([e, on]) => (
                <div key={String(e)} className={`mt-1 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] transition-colors duration-300 ${on ? "border-ok-soft bg-ok-soft text-ok" : "border-line text-ink"}`}><span className="flex-1 truncate">{String(e)}</span>{on ? <span className="font-medium">À ajouter</span> : <Plus className="h-3 w-3 text-brand" strokeWidth={2} />}</div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
            <span className={`rounded-full px-2 py-0.5 font-medium transition-opacity ${ph.squatOut ? "bg-danger-soft text-danger opacity-100" : "opacity-0"}`}>1 exercice retiré</span>
            <span className={`rounded-full px-2 py-0.5 font-medium transition-opacity ${ph.squatOut ? "bg-ok-soft text-ok opacity-100" : "opacity-0"}`}>1 exercice ajouté</span>
          </div>
          <div className="mt-3 flex justify-end gap-1.5">
            <span className="rounded-full border border-line px-3 py-1.5 text-[11px] font-medium text-ink">Annuler</span>
            <span ref={setSaveEl} className={`rounded-full px-3 py-1.5 text-[11px] font-medium text-white transition-colors ${ph.saved ? "bg-ok" : "bg-brand"}`}>{ph.saved ? "Enregistré ✓" : "Enregistrer les modifications"}</span>
          </div>
        </div>

        {!reduced && <Cursor stageEl={stage} targetEl={targetEl} clicking={ph.clicking} />}
      </div>

      <div className={`mt-5 flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-2.5 text-sm text-brand transition-opacity duration-500 ${ph.saved || !ph.lit2 ? "opacity-100" : "opacity-0"}`}>
        <Lightbulb className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {ph.saved ? "Marc T. verra sa séance ajustée dès sa prochaine connexion." : "Marc T. a signalé une douleur pendant sa séance."}
      </div>

      <div className="mt-6 flex flex-col items-center justify-center gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:gap-6">
        <p className="flex items-center gap-2 text-sm text-slate-600"><Smartphone className="h-5 w-5 text-blue-600" strokeWidth={1.75} />Le patient verra son nouveau programme dès sa prochaine connexion.</p>
        <ArrowRight className="hidden h-4 w-4 text-slate-400 sm:block" strokeWidth={1.75} />
        <div className={`rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-opacity duration-500 ${ph.saved ? "opacity-100" : "opacity-40"}`}>
          <p className="font-medium text-slate-900">Programme mis à jour par votre kiné</p>
          <p className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />Nouvelle séance disponible</p>
        </div>
      </div>
    </div>
  );
}
```

Note : l'icône `Bell` importée n'est pas utilisée — la retirer avant lint.

- [ ] **Step 3: Remplacer la section dans `app/page.tsx`**

Imports : retirer `KineDemoMockup`, ajouter `import KineJourneyDemo from "@/components/KineJourneyDemo";` et `Eye, PenSquare, Zap` depuis `lucide-react` (si `PenSquare` n'existe pas dans la version installée, utiliser `SquarePen`).

Remplacer la section « Côté praticien » (du commentaire `{/* ── Côté praticien … */}` jusqu'au `</Reveal>` qui la ferme) par :

```tsx
        {/* ── Côté kiné : tableau de bord → patient → action ─────── */}
        <Reveal>
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Côté kiné</p>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              De son tableau de bord à la fiche de chaque patient.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Tout ce qui se passe entre deux séances, en un coup d&apos;œil. Comprendre, décider, ajuster : 2 clics suffisent.
            </p>
          </div>

          <RevealGroup className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
            {[
              { icon: Eye, title: "Tout voir", body: "Assiduité, phases, dernières séances et signaux importants." },
              { icon: Zap, title: "Comprendre vite", body: "Ouvrez le suivi détaillé, l'historique de douleur et l'adhérence." },
              { icon: PenSquare, title: "Agir immédiatement", body: "Ajustez le programme en quelques clics, le patient voit le changement aussitôt." },
            ].map((f) => (
              <RevealItem key={f.title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><f.icon className="h-5 w-5" strokeWidth={1.75} /></span>
                <span><span className="block font-semibold text-slate-900">{f.title}</span><span className="mt-1 block text-sm leading-relaxed text-slate-600">{f.body}</span></span>
              </RevealItem>
            ))}
          </RevealGroup>

          {/* La démo déborde de la colonne de texte : pleine largeur jusqu'à 1 200 px. */}
          <div className="mx-auto mt-12 max-w-7xl lg:-mx-16">
            <KineJourneyDemo />
          </div>

          <div className="mt-10 text-center">
            <PrimaryCta>Créer un compte praticien</PrimaryCta>
          </div>
        </section>
        </Reveal>
```

- [ ] **Step 4: Typecheck, lint, vérification**

Run: `npx tsc --noEmit && npm run lint && grep -rn "KineDemoMockup" app components` → aucune occurrence.
Ouvrir `/` : la section montre les trois arguments, puis la démo pleine largeur ; le curseur clique Marc → le panneau 2 s'allume → « Ajuster » → panneau 3 → « Squat assisté » passe en rouge → « Enregistrer » → résumé + bandeau ; boucle. Sous 1024 px : panneaux empilés. Avec « réduire les animations » activé dans l'OS : tout allumé, pas de curseur.

- [ ] **Step 5: Commit**

```bash
git add components/KineJourneyDemo.tsx components/KineDemoScreens.tsx app/page.tsx
git commit -m "Accueil : section Côté kiné avec démo 3 panneaux (dashboard → patient → action)"
```

---

### Task 14: Restyle « Mes séances » (liste + éditeur)

**Files:**
- Modify: `components/SeancesTabs.tsx`, `app/dashboard/seances/page.tsx`, `app/dashboard/seances/[id]/page.tsx`, `components/ExercisePicker.tsx`

Aucune fonctionnalité ajoutée ni retirée. Lire chaque fichier en entier avant de modifier.

- [ ] **Step 1: Table de substitution (appliquer avec `replace_all` dans les quatre fichiers)**

| Avant | Après |
|---|---|
| `text-stone-900`, `text-stone-800` | `text-ink` |
| `text-stone-700`, `text-stone-600` | `text-ink` |
| `text-stone-500`, `text-stone-400`, `text-stone-300` | `text-muted` |
| `bg-white` | `bg-surface` |
| `border-stone-200`, `border-stone-300`, `border-stone-100` | `border-line` |
| `bg-stone-50`, `bg-stone-100` | `bg-app-bg` |
| `hover:bg-stone-50`, `hover:bg-stone-100` | `hover:bg-app-bg` |
| `bg-blue-600` | `bg-brand` ; `hover:bg-blue-700` → `hover:bg-brand-dark` |
| `text-blue-700`, `text-blue-600` | `text-brand` |
| `bg-blue-50` | `bg-brand-soft` ; `border-blue-600` → `border-brand` |
| `focus:border-blue-600 focus:ring-2 focus:ring-blue-100` | `focus:border-brand focus:ring-2 focus:ring-brand-soft` |
| `bg-red-50 … text-red-700` (bandeau d'erreur) | `bg-danger-soft … text-danger` |
| `text-red-600`, `hover:text-red-600` (corbeille, supprimer) | `text-danger`, `hover:text-danger` |
| `bg-red-600` (bouton Confirmer) | `bg-danger` |
| `border-l-[3px] border-l-emerald-600 … text-emerald-800` (« Séance enregistrée ») | `bg-ok-soft … text-ok`, sans bordure gauche |
| `font-display` | *(retirer)* |
| `transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(120,53,15,0.16)]` | *(retirer — pas d'ombre au repos ni au survol)* |
| `rounded-lg` sur les boutons principaux (`+ Nouvelle séance`, `Créer et composer`, `Enregistrer la séance`, `Dupliquer`) | `rounded-full` |

- [ ] **Step 2: Badges de phase dans `SeancesTabs.tsx`**

Remplacer la table de couleurs des badges de phase (rouge/orange/ambre/vert selon la phase) par un seul style : `rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand`, texte = `STAGE_SHORT[stage]` (import depuis `@/lib/exercise/prescription`), `title={STAGE_LABELS[stage]}`. Le badge « Personnalisée » devient `bg-app-bg text-muted`, « Plateforme » `bg-surface text-muted border border-line`, « Aucun exercice » `bg-warn-soft text-warn`.

- [ ] **Step 3: Onglets → segmenté**

Dans `SeancesTabs.tsx`, le conteneur des deux onglets devient `inline-flex items-center gap-1 rounded-full border border-line bg-app-bg p-1` ; onglet actif `rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm`, inactif `rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:text-ink`.

- [ ] **Step 4: En-tête de page `app/dashboard/seances/page.tsx`**

Remplacer le bloc titre (lien « ← Tableau de bord », lien « Gérer mes exercices → », `<h1>`, `<p>`) par :

```tsx
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Mes séances</h1>
            <p className="mt-1 text-sm text-muted">Composez vos propres séances ; elles seront proposées aux patients de la phase choisie.</p>
          </div>
          <Link href="/dashboard/exercises" className="text-sm font-medium text-brand hover:underline">Gérer mes exercices →</Link>
        </div>
```

(Le bouton « + Nouvelle séance » reste dans `SeancesTabs`, sous l'onglet.) Même motif dans `app/dashboard/seances/[id]/page.tsx` : lien « ← Mes séances » conservé en `text-muted hover:text-ink`, `<h1 className="text-2xl font-semibold text-ink">`.

- [ ] **Step 5: Contrôle, typecheck, lint, commit**

Run: `grep -n "stone-\|slate-\|blue-\|font-display\|emerald-\|red-" components/SeancesTabs.tsx app/dashboard/seances/page.tsx "app/dashboard/seances/[id]/page.tsx" components/ExercisePicker.tsx` → vide. `npx tsc --noEmit && npm run lint`. Vérifier dans le navigateur : les deux onglets, créer/dupliquer/supprimer fonctionnent comme avant.

```bash
git add components/SeancesTabs.tsx app/dashboard/seances components/ExercisePicker.tsx
git commit -m "Mes séances : restyle aux tokens de l'app (segmenté, badges de phase, cartes)"
```

---

### Task 15: Restyle « Mes exercices » + suppression des orphelins

**Files:**
- Modify: `components/ExerciseLibraryGrid.tsx`, `app/dashboard/exercises/page.tsx`, `components/ExerciseVideoUpload.tsx`, `components/DocumentUpload.tsx`
- Delete: `components/PatientIntake.tsx`

- [ ] **Step 1: Appliquer la table de substitution de la Tâche 14, Step 1, aux quatre fichiers**, plus pour les deux composants d'upload (palette `slate`) : `text-slate-900/800/700` → `text-ink`, `text-slate-600/500/400` → `text-muted`, `border-slate-200/300` → `border-line`, `bg-slate-50/100` → `bg-app-bg`, `text-red-600` → `text-danger`, `bg-blue-600` → `bg-brand`. Attention : `DocumentUpload` s'affiche aussi côté patient (`app/patient/onboarding`) sur fond `bg-slate-50` — les tokens `surface`/`line`/`ink`/`muted` y restent lisibles ; ne pas y introduire `bg-app-bg`, garder `bg-surface`.

- [ ] **Step 2: Tuiles de zones du corps (`ExerciseLibraryGrid.tsx`)**

Tuile active : `border-brand bg-brand-soft` ; inactive : `border-line bg-surface hover:bg-app-bg`. Pastilles de zones dans le formulaire : cochée `border-brand bg-brand-soft text-brand`, sinon `border-line text-ink`. Menu « ⋮ » : panneau `rounded-lg border border-line bg-surface shadow-sm`. Mention « Votre exercice » → `text-brand`.

- [ ] **Step 3: En-tête de page `app/dashboard/exercises/page.tsx`**

```tsx
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Mes exercices</h1>
            <p className="mt-1 text-sm text-muted">Créez vos propres exercices et filmez-en une démonstration ; elles seront disponibles à ajouter dans vos séances.</p>
          </div>
          <Link href="/dashboard/seances" className="text-sm font-medium text-brand hover:underline">← Mes séances</Link>
        </div>
```

- [ ] **Step 4: Supprimer l'orphelin**

```bash
git rm components/PatientIntake.tsx
```
Run: `grep -rn "PatientIntake" app components lib` → vide.

- [ ] **Step 5: Contrôle, typecheck, lint, commit**

Run: `grep -n "stone-\|slate-\|blue-\|font-display\|red-" components/ExerciseLibraryGrid.tsx app/dashboard/exercises/page.tsx components/ExerciseVideoUpload.tsx components/DocumentUpload.tsx` → vide (sauf `bg-slate-50` du layout patient, qui n'est pas dans ces fichiers). `npx tsc --noEmit && npm run lint`. Vérifier : tuiles, recherche, création, masquer/réafficher, upload vidéo ; et `/patient/onboarding` (bloc documents lisible).

```bash
git add components/ExerciseLibraryGrid.tsx app/dashboard/exercises/page.tsx components/ExerciseVideoUpload.tsx components/DocumentUpload.tsx
git commit -m "Mes exercices : restyle aux tokens de l'app, suppression de PatientIntake (orphelin)"
```

---

### Task 16: Documents (`CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`)

**Files:**
- Modify: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`

- [ ] **Step 1: `CLAUDE.md`**

§ 3, puce « Exercise library » : remplacer `plus staging/override tables (\`exercise_overrides\`, \`exercise_feedback\`) that support adaptive difficulty.` par `plus \`instructor_hidden_exercises\` (per-instructor hide list). A workout with \`patient_id\` set is a **patient-specific copy** created by « Ajuster la séance » (\`source_workout_id\` points at the original); it is visible only to that patient and their instructor (migration 0042) and never appears in library lists.`

§ 4 Instructor, après l'étape 5, ajouter : `6. From the patient page, click « Ajuster la séance » to add/remove exercises for that patient only — the app copies the séance for them and sends them an automatic message.` (renuméroter l'ancienne 6 en 7.)

§ 4 Patient, étape 3 : remplacer `(adaptive difficulty via \`lib/exercise/autoEase.ts\`, pain/difficulty feedback)` par `(pain feedback at the end; the phase brake in \`lib/exercise/stageProgress.ts\` only ever slows progression down)`.

§ 5 : remplacer la puce `- Analytics/adherence charts beyond a simple completion list` par `- Analytics beyond what the instructor UI shows today (adherence %, day-over-day tiles, 30-day pain history). No exports, no cross-patient reports.`

§ 8, puce React : après `(no emoji as UI icons — use real icons or flag the need for real photos)` ajouter `. The instructor app uses one palette, declared as Tailwind \`@theme\` tokens in \`app/globals.css\` (\`app-bg\`, \`surface\`, \`line\`, \`ink\`, \`muted\`, \`brand\`, \`ok\`, \`warn\`, \`danger\` + \`-soft\` variants); Fraunces (\`font-display\`) is for the marketing site only.`

- [ ] **Step 2: `PRODUCT.md`**

Dans « Capabilities and Constraints », première puce : `478 exercises` → `437 exercises`. Puce « Explicitly out of scope » : remplacer `analytics/charts beyond a simple completion list` par `analytics beyond the instructor UI's own indicators (adherence %, daily tiles, 30-day pain history)`. Ajouter à la puce « Built and live » : `, per-patient séance adjustment (« Ajuster la séance », patient-specific copies)`.

- [ ] **Step 3: `DESIGN.md`**

Remplacer le paragraphe « The system runs two coordinated registers… » par : `Depuis le 2026-09-03, l'application kiné (/dashboard/*) utilise une seule palette, déclarée en tokens Tailwind dans app/globals.css : fond #f5f7fb, surfaces blanches, bordures #e5e9f0, encre #0f172a, texte secondaire #64748b, accent #155dfc, sidebar #0d1b3e, et trois couleurs sémantiques saturées (vert #16a34a, orange #f59e0b, rouge #dc2626) avec leurs fonds pâles. Le site vitrine garde sa palette slate et Fraunces pour les titres ; l'app est entièrement en Instrument Sans.` Dans le frontmatter `colors`, supprimer les clés `paper*`, `grade-*`, `clinical-*` et ajouter `app-bg`, `surface`, `line`, `ink`, `muted`, `sidebar`, `ok`, `warn`, `danger` avec les valeurs ci-dessus. Dans « Do's and Don'ts », remplacer la ligne « Do keep the slate/stone register split intentional » par « Do keep the marketing site (slate + Fraunces) and the instructor app (tokens + Instrument Sans) visually distinct — never mix them. » et supprimer « Don't introduce a third neutral scale… ».

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md PRODUCT.md DESIGN.md
git commit -m "Docs : palette unique de l'app kiné, ajustement par patient, périmètre des indicateurs"
```

---

### Task 17: Smoke test navigateur et clôture

**Files:** aucun (vérification).

- [ ] **Step 1: Contrôles globaux**

Run: `npx tsc --noEmit && npm run lint && npm test && grep -rn "rehab-panel\|var(--ink\|var(--hairline\|var(--grade\|faf7f2" app components lib` → tout passe, grep vide.

- [ ] **Step 2: Parcours desktop (Chrome, 1280 px)**

1. `/dashboard` — tuiles, à traiter, activité, bandeau ; « Voir tout » → liste filtrée.
2. `/dashboard/patients` — tableau, segmenté, filtre, recherche ; ligne → fiche.
3. Fiche — stats, calendrier (navigation mois, clic jour → détail), courbe, séance recommandée ; « Ajuster la séance » : retirer 1 + ajouter 1 → bandeau vert, badge « Séance de {Prénom} », message dans le fil.
4. Côté patient (session patient) — `/patient` montre le message non lu ; `/patient/seance-du-jour` liste les nouveaux exercices ; la séance guidée fonctionne.
5. `/dashboard/seances` — onglets, créer, dupliquer, supprimer ; la copie du patient n'apparaît **pas**.
6. `/dashboard/exercises` — tuiles, recherche, masquer/réafficher.
7. `/` — section Côté kiné, démo qui boucle.

- [ ] **Step 3: Parcours mobile (390 px)**

Sidebar → barre horizontale sombre ; tableau des patients → liste ; tuiles 2×2 ; démo empilée sans curseur ; modale d'ajustement défilable.

- [ ] **Step 4: Reduced motion**

Activer « Réduire les animations » dans l'OS, recharger `/` : trois panneaux allumés, pas de curseur, bandeau visible.

- [ ] **Step 5: Rapport**

Lister à Philippe, en français : ce qui a été vérifié, ce qui a échoué (avec la sortie exacte), et l'état de la migration 0042 (appliquée ou non).

---

## Auto-revue du plan (faite à la rédaction)

- **Couverture de la spec** : § 2 → T1 ; § 3 → T3 ; § 4 → T6–T7 ; § 5 → T2, T4–T5 ; § 6 → T11–T12 ; § 7 → T8–T10, T12 ; § 8 → T14–T15 ; § 9 → T13 ; § 10 → T16 ; § 11 → tests dans T2/T4/T6/T9/T11 + T17 ; § 12 → ordre en tête ; § 13 (hors périmètre) → aucune tâche ne l'implémente.
- **Cohérence des noms** : `computeSignal`/`Signal` (T2) utilisés tels quels en T4 et T6 ; `PatientRow` (T4) consommé par `PatientsTable` (T5) ; `loadDashboardHome`/`Tile` (T6) par T7 ; `adjustPatientWorkout` (T9) par `AdjustWorkoutModal` (T10) via la prop `action`, branchée en T12 ; `buildPainSeries`/`PainSeries` (T11) par T12 ; `Cursor` (T13) conservé dans `KineDemoScreens.tsx`.
- **Sans placeholder** : chaque étape de code contient le code ; les restyles (T14–T15) sont des tables de substitution exhaustives + contrôles `grep` vides.

