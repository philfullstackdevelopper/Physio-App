# Traduction de l'interface — conventions (2026-11-06)

EasyPhysio is bilingual French / English (CLAUDE.md §1). French is the default and the reference text. **For anyone who never switches language, nothing may change**: the French output must stay byte-for-byte identical, including « », non-breaking spaces (U+00A0 / U+202F), typographic apostrophes ’, the middle dot in patient·e, etc.

## Setup (already done)

- Library: **next-intl 4** (no locale in URLs). Locale = `NEXT_LOCALE` cookie, also stored in `app_users.locale` (migration 0084).
- Config: `i18n/locales.ts` (LOCALES, INTL_TAGS), `i18n/request.ts` (loads every `messages/<locale>/<area>.json`; missing English keys fall back to French).
- Areas (one JSON per area and per language): `common, home, auth, legal, patient, dashboard, billing, exercise, admin, demo`. **Only edit the area files you were given.** Don't touch `common.json`.
- Language switcher: `components/LanguageSwitcher.tsx` (`variant="compact"` pill FR·EN, `variant="row"` for settings pages, `tone="light"` on dark backgrounds).

## How to move a string

- **Server Component / page**: `import { getTranslations } from "next-intl/server"; const t = await getTranslations("patient.compte");` then `t("title")`.
- **Client Component** (`"use client"`): `import { useTranslations } from "next-intl"; const t = useTranslations("patient.compte");`.
- **Server Action / Route Handler**: `getTranslations` works there too (the locale comes from the cookie).
- **generateMetadata / `export const metadata`**: turn a static `metadata` into `export async function generateMetadata()` using `getTranslations`.
- **lib/ functions that return user-facing text** (no hooks there; also used by Vitest tests): add an optional last parameter `locale: Locale = "fr"` and use `libTranslator(locale, { fr, en }, "namespace")` from `lib/i18n/translator.ts` with static JSON imports from your area. Existing callers and tests keep getting French. Callers that can know the locale pass it (`useLocale()` on the client, `await getLocale()` on the server, both from next-intl / next-intl/server).
  In lib/ files use **relative imports with the `.ts` extension** (`../../i18n/locales.ts`, `../i18n/translator.ts`): the tests run with `node --test` (`npm test`), which has no `@/` alias and needs extensions. Node cannot import `.json` without an import attribute, so a lib file covered by a `*.test.ts` should not import message JSON: take labels/translator from the caller instead.
- **First visit**: `proxy.ts` guesses the language from the browser (Accept-Language) when no cookie exists yet; nothing to do in screens.
- **Dates & numbers**: replace hard-coded `"fr-FR"` with the current locale's tag: `intlTag(locale)` from `lib/i18n/translator.ts` (fr → "fr-FR", en → "en-GB"). Amounts stay in euros.
- **Rich text** (bold, links inside a sentence): `t.rich("key", { b: (c) => <strong>{c}</strong>, link: (c) => <Link href="/x">{c}</Link> })` with `"… <b>texte</b> …"` in the JSON.
- **Plurals**: ICU, e.g. `"{count, plural, one {# séance} other {# séances}}"`. Keep French output identical to the current behaviour (check how the code pluralised 0).
- **ICU gotchas**: `{` `}` are placeholders — a literal brace must be written `'{'`. A straight apostrophe `'` immediately before `{` or `}` starts an escape: prefer the typographic ’ only if the original already used it, otherwise rephrase the placeholder position. `#` is special only inside plural.
- Key names: short English camelCase, grouped by screen: `patient.compte.deleteAccount`. The JSON nesting = namespace.
- Strings built by concatenation → one message with placeholders (`"Bonjour {name}"`), so word order can differ in English.
- Don't touch: classNames/layout (phone layouts are frozen), code comments (stay French), data from the database (exercise names, instructions, condition and séance names — handled separately), console.error texts, admin-only pages (`/admin`), anything outside your file list.
- Very long English strings that might overflow a phone screen: keep them as short as the French or shorter.

## English style

UK English, plain and warm, "you". Glossary (keep consistent):

| French | English |
|---|---|
| kiné / kinésithérapeute | physio / physiotherapist |
| patient·e | patient |
| séance | session |
| programme | programme |
| exercice | exercise |
| Ajuster la séance | Adjust the session |
| Suivi & facturation | Follow-up & billing |
| note d'honoraires | fee note |
| tableau de bord | dashboard |
| douleur (0–10) | pain (0–10) |
| bilan | assessment |
| cabinet | practice |
| abonnement | subscription |
| liste d'attente | waiting list |
| RPPS | RPPS (French practitioner number) |

## Texts that need human review (never final)

Legal (CGU, privacy policy, legal notice, cookie banner, health-data consent, terms acceptance), billing legal wording (« hors nomenclature », art. R.4321-98 CSP, written price acceptance, fee-note mentions) and clinical wording (pain guidance, phase brake, safety warnings).

- Translate them anyway (draft), and add a sibling key `"_review": "Draft translation — needs review by <lawyer | partner physio> before launch"` at the top of the namespace object in the **English** file.
- On the English legal pages and the consent step, show the banner: `useTranslations("common")("reviewBanner")` / `getTranslations("common")` → `t("reviewBanner")` (« the French version is authoritative »), only when the locale isn't French.
- French legal terms stay visible in English where they are legal references: e.g. `« hors nomenclature » (outside the French national fee schedule)`, `art. R.4321-98 of the French Public Health Code (CSP)`.

## Checking your work

- `npx tsc --noEmit -p .` — ignore errors in files outside your list (others are editing in parallel; one pre-existing error in `app/patient/programme/page.tsx` is known).
- `node --no-warnings=ExperimentalWarning --test <your lib test files>` if you touched lib/ (the project uses node:test, not Vitest).
- Don't start a dev server or run `next build`; don't commit.
- Every key used in code must exist in **both** `messages/fr/<area>.json` and `messages/en/<area>.json`.

## Database content (platform exercises, conditions, séances)

- Exercise **names** are English in the database (they're the key to the drawing, the video and the « filmed » list). English users see them as-is.
- **French exercise names (2026-11-08, Philippe)**: `i18n/content/fr-exercise-names.json` maps the **exact English DB name** of each platform exercise to its French name. For French users, `localizingFetch` (`frenchExerciseNamesJson` in `lib/i18n/dbContent.ts`) renames `name` on GET responses — only on objects that *are* exercises (rows of `/rest/v1/exercises`, or an embed under the key `exercises` / `exercise`), never on séances or conditions, and never on an exercise whose `created_by` is set (kiné-written). It also translates `exercise_results.exercise_name` on reads and turns it back into English on writes, so the database keeps one name per exercise. A list requested with `order=name` is re-sorted by the French name.
  - Any code that looks something up **by exercise name** must go through `platformExerciseName(name)` (`lib/exercise/exerciseNames.ts`), which turns a known French name back into the DB name: already done in `ExerciseIllustration`, `isPickableExercise` / `isPickableSeance`, `signFilmedVideoByName`. Prefer looking things up by id when you can.
  - Searches over exercise names use `exerciseNameMatches(name, query)`: matches the French name, the English original, accent-insensitive.
  - Hard-coded demo data (`app/prototypes/*`) keeps the English DB name (it finds the drawing) and displays `exerciseNameFor(name, locale)`.
  - **A migration that adds or renames a platform exercise must add its entry** (English key copied exactly → French name), otherwise the English name shows to French users. French names must stay unique (a test checks it).
  - Draft by Claude: partner-physio review required (`_review` key).
- Exercise **instructions**, condition names/descriptions, séance names/descriptions and body-area labels: `i18n/content/en.json` maps the **exact French text** to English. `lib/i18n/dbContent.ts` translates GET responses for non-French users (fields `name`, `description`, `instructions`, `label`) and turns English platform text back into French in writes (POST/PATCH bodies), so the database only stores French. French users: no transformation of these (only the exercise names above). For text stored outside the Supabase client (e.g. fee-note notes), use `localizeDbText(text, "fr")`.
- A migration that adds or edits platform text must add the matching English entry (copy the French key exactly), otherwise the French shows.
- `lib/exercise/prescription.ts` reads the target (minutes / seconds) from either language, so the prescribed dose never depends on the language.
- All of it is a Claude draft: partner-physio review required (`_review` key at the top of the file).
