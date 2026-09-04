# Refonte de l'interface kiné — design

Date : 2026-09-03. Remplace `2026-09-02-dashboard-redesign-design.md`.
Références visuelles : deux maquettes fournies par Philippe le 2026-09-03
(`~/Downloads/ChatGPT Image 3 sept. 2026, 11_49_43.png` = section vitrine
« Côté kiné » + tableau de bord ; `…11_49_52.png` = tableau « Mes clients »
+ simulation 3 panneaux). Les maquettes priment sur les règles écrites
antérieures ; les documents contredits sont mis à jour dans cette refonte
(§ 10).

## 1. But

Donner au côté kiné une seule identité visuelle (celle des maquettes),
restructurer ses quatre écrans principaux (tableau de bord, liste des
patients, fiche patient, bibliothèques séances/exercices), ajouter la
fonctionnalité « Ajuster la séance » par patient, et remplacer la démo kiné
de la page d'accueil par une simulation pleine largeur en trois panneaux.

Le côté patient, la page Tarif & paiements, l'admin et l'authentification
ne changent pas (une seule exception, § 6.5 : un message automatique
envoyé au patient).

Vocabulaire : on dit **patient**, pas « client » — la maquette elle-même
dit « + Ajouter un patient », et c'est le vocabulaire de tout le produit.

## 2. Système visuel

Une seule palette pour tout `/dashboard/*`. Les trois palettes actuelles
(stone + bleu ; « papier/encre » de `.rehab-panel` ; slate des composants
d'upload) disparaissent. Déclarée une fois dans `app/globals.css` sous
`@theme` (Tailwind 4), de sorte que les classes `bg-surface`, `text-muted`,
`border-line`, etc. existent.

| Rôle | Token | Valeur |
|---|---|---|
| Fond de page | `--color-app-bg` | `#f5f7fb` |
| Surface (cartes, tableau) | `--color-surface` | `#ffffff` |
| Bordure / filet | `--color-line` | `#e5e9f0` |
| Encre | `--color-ink` | `#0f172a` |
| Texte secondaire | `--color-muted` | `#64748b` |
| Accent | `--color-brand` | `#155dfc` (inchangé) |
| Accent pâle | `--color-brand-soft` | `#eaf1ff` |
| Sidebar | `--color-sidebar` | `#0d1b3e` |
| OK | `--color-ok` / `--color-ok-soft` | `#16a34a` / `#e8f7ee` |
| Attention | `--color-warn` / `--color-warn-soft` | `#b45309` / `#fff4e0` |
| Danger | `--color-danger` / `--color-danger-soft` | `#dc2626` / `#fdecec` |

Note (2026-09-04) : `--color-warn` est passé de #f59e0b à #b45309 pour un contraste AA du texte orange sur fond pâle.

- **Typographie** : Instrument Sans partout dans l'app (titres compris).
  Fraunces (`font-display`) reste réservée au site vitrine. Chiffres en
  `tabular-nums` dans les tuiles et le tableau.
- **Formes** : cartes `rounded-xl` (12 px), champs `rounded-lg` (8 px),
  badges et boutons `rounded-full`. Ombre : aucune au repos ; `shadow-sm`
  uniquement sur les modales.
- **Couleur sémantique** : vert = fait / à jour, orange = inactivité,
  rouge = douleur. Le bleu ne sert qu'à l'action principale, aux liens et
  à l'état actif.
- **Badges de phase** (Mes séances, Mes patients) : pilule à fond
  `brand-soft` texte `brand`, libellé court (« Phase 1 » … « Phase 4 »,
  correspondance : aiguë = 1, subaiguë = 2, rééducation = 3, retour au
  sport = 4), libellé complet de `STAGE_LABELS` en `title`.
- **Supprimés** : fond crème `#faf7f2`, halo ambré, `.grain` sur le
  dashboard, `.rehab-panel` et ses variables `--paper/--ink/--grade-*`.
- **Motion** : conserver `fadeInUp` à l'arrivée des sections ; aucune
  autre animation dans l'app. `prefers-reduced-motion` respecté partout.
- Icônes : lucide-react uniquement, `strokeWidth 1.75`. Jamais d'emoji.

## 3. Sidebar (`components/DashboardSidebar.tsx`)

- Fond `sidebar`, largeur 224 px, texte blanc à 80 %, entrée active :
  fond blanc à 10 % + texte blanc 100 %.
- Haut : `LogoMark` + « EasyPhysio ».
- Entrées (inchangées) : Tableau de bord, Mes patients, Mes séances,
  Mes exercices, Tarif & paiements. Pas de Paramètres ni d'Aide.
- Bas : bloc utilisateur — pastille initiales (fond `brand`), nom complet,
  « Kinésithérapeute » — puis « Se déconnecter ». Le nom est passé depuis
  `app/dashboard/layout.tsx` (qui charge déjà `instructor`) en prop
  `instructorName`.
- Mobile (< 640 px) : barre horizontale existante, fond `sidebar`.

## 4. Tableau de bord (`app/dashboard/page.tsx`)

Colonne `max-w-5xl`. De haut en bas :

1. **En-tête** : « Bonjour {Prénom} » (24 px, 600) à gauche ; à droite la
   date du jour en texte (« Mercredi 3 septembre »), pas de sélecteur.
2. **Quatre tuiles** (grille 4 colonnes, 2×2 sous 768 px), chacune :
   grand chiffre coloré, libellé, sous-ligne de variation.
   - *Séances faites* (vert) : `workout_logs.completed_at` ≥ aujourd'hui
     00:00. Sous-ligne « ↑2 vs hier » / « ↓1 vs hier » / « = hier »
     (hier = veille 00:00 → aujourd'hui 00:00).
   - *Douleurs signalées* (rouge) : `patient_feedback` du jour avec
     `pain_score ≥ PAIN_HOLD` (6). Même variation vs hier.
   - *Sans activité récente* (orange) : patients sans séance depuis 7 jours,
     comptes de plus de 7 jours — règle actuelle inchangée.
   - *Patients suivis* (encre) : nombre de patients.
3. **Deux colonnes** (une seule sous 1024 px) :
   - **À traiter aujourd'hui** + lien « Voir tout (n) » →
     `/dashboard/patients?filtre=surveiller`. Lignes :
     - douleur : initiales, nom, « Douleur signalée » en rouge, à droite
       « 7/10 » (dernière note ≥ 6 des 14 derniers jours) + chevron ; fond
       `danger-soft`. Source : `assessSignals` (règle existante) ; le
       score affiché est la dernière note, la moyenne reste dans `title`.
     - inactivité : initiales, nom, « Aucune séance depuis N jours » en
       orange, chevron ; fond blanc.
     - Tri : douleurs sévères, douleurs, inactifs ; alphabétique ensuite.
     - Vide : « Rien à traiter aujourd'hui. »
   - **Activité récente** + « Voir tout (n) » → `/dashboard/patients`.
     Les 5 dernières lignes de `workout_logs` (jointes à `patients.full_name`)
     : initiales vertes, « {Nom} a terminé sa séance », à droite
     « Aujourd'hui » / « Hier » / « Lun. 1 sept. ». Vide : « Aucune séance
     cette semaine. »
4. **Bandeau** bleu pâle (`brand-soft`) en bas, icône `Lightbulb` :
   « {Nom} a signalé une douleur pendant sa séance. » = la douleur
   signalée la plus récente du jour ; absent s'il n'y en a pas.

Formatage relatif partagé : `lib/format/relativeDay.ts` →
`relativeDay(iso, now)` : « Aujourd'hui », « Hier », « Il y a N jours »
(2–6), sinon « Lun. 1 sept. ». Utilisé par § 4, § 5, § 6.

## 5. Mes patients (`app/dashboard/patients/page.tsx` + `components/PatientsTable.tsx`)

Remplace `PatientsFilter`. Colonne `max-w-5xl`.

- **En-tête** : « Mes patients », sous-titre « Suivez tous vos patients et
  intervenez en quelques clics. », bouton `brand` « + Ajouter un patient »
  (→ `/dashboard/patients/new`, page inchangée hormis les tokens).
- **Barre** : recherche « Rechercher un patient… » ; segmenté
  **Tous / À surveiller / À jour** (compte entre parenthèses) ; icône
  filtre qui déplie les menus Condition et Phase existants. Le paramètre
  `?filtre=surveiller` présélectionne le segment.
- **Tableau** (`<table>`, en-têtes Patient · Phase · Dernière séance ·
  Adhérence · Signal) ; chaque ligne est un lien vers la fiche :
  - *Patient* : pastille initiales (fond `brand-soft`, texte `brand`),
    nom (600), condition en `muted` dessous (« Condition non assignée »).
  - *Phase* : badge § 2, depuis `patient_profiles.injury_stage` ; « — »
    si absent.
  - *Dernière séance* : `relativeDay(max(completed_at))` ; « Jamais ».
  - *Adhérence* : « 82 % » + barre 4 px (≥ 80 vert, 50–79 orange, < 50
    rouge) ; « — » sans recommandation.
  - *Signal* : rouge « Douleur signalée 7/10 » · orange « Aucune séance
    depuis N jours » · vert « ● À jour ». Priorité douleur > inactivité.
  - Chevron à droite.
- Sous 768 px : le tableau devient une liste — ligne 1 nom + signal,
  ligne 2 condition · dernière séance · adhérence.
- Vide : état actuel conservé (icône, « Aucun patient pour le moment »,
  bouton).

### Règles partagées (nouveaux modules, testables)

- `lib/exercise/adherence.ts` — `computeAdherence({ completedAt[],
  recommendations: { timesPerWeek, createdAt }[], now })` →
  `{ pct | null, done, expected }`. Fenêtre = 28 jours. Pour chaque
  recommandation : `semaines = min(4, ceil(joursDepuis(createdAt) / 7))`,
  `attendu += (timesPerWeek ?? 1) × semaines`. `done` = séances dans la
  fenêtre. `pct = min(100, round(done / attendu × 100))`, `null` si
  `attendu = 0`. Libellé : ≥ 80 « Bonne », 50–79 « Moyenne », < 50
  « Faible ».
- `lib/dashboard/patientSignal.ts` — `computeSignal({ assessment,
  lastPain, lastSessionAt, createdAt, now })` → `{ kind: "pain" |
  "inactive" | "ok", label, score? }`. `pain` si `assessment.concerning`
  (règle `assessSignals`, 2 notes minimum sur 14 jours) ; sinon
  `inactive` si aucune séance depuis ≥ 7 jours et compte de plus de
  7 jours ; sinon `ok`. Le tableau de bord (§ 4) et le tableau (§ 5)
  utilisent la même fonction : les deux vues ne peuvent pas se contredire.

## 6. Fiche patient (`app/dashboard/patients/[id]/page.tsx`)

Colonne `max-w-5xl`, palette § 2 (fin de `.rehab-panel`).

1. **En-tête** : « ← Retour à la liste », nom (24 px), « {Condition} ·
   Phase N » en `muted`, bouton `brand` **Ajuster la séance** (désactivé
   avec `title` « Ajoutez d'abord une séance recommandée » si aucune).
2. **Trois stats** (carte unique divisée en trois) :
   - *Douleur* : dernière note « 5/10 » (rouge si ≥ 6) + « ↑2 depuis la
     séance précédente » / « ↓1 … » / « = » ; « — » sans note.
   - *Adhérence* : « 82 % » + badge Bonne/Moyenne/Faible.
   - *Dernière séance* : `relativeDay` + « 15 min · 3 exercices ».
3. **Ligne calendrier + douleur** (2 colonnes, 1 sous 1024 px) :
   - **Calendrier** : `PatientCalendar` existant (mois, navigation
     `?month=`, clic jour → détail), pastilles aux couleurs § 2
     (vert/orange/rouge/gris clair), légende inchangée (Bien / Moyen /
     Difficile / Pas de séance). Le détail du jour s'affiche sous le
     calendrier (plus de panneau à deux visages).
   - **Historique douleur** : `components/PainHistoryChart.tsx`, SVG
     maison (pas de librairie) : notes de douleur des 30 derniers jours,
     axe Y 0–10, points reliés en rouge, dates courtes en X (max 6
     étiquettes). Vide : « Pas encore de ressenti transmis. »
4. **Séance recommandée** : la séance « en cours » (`pickActiveWorkout`)
   — nom, « 15 min · 3×/semaine », ses exercices en lignes (icône zone du
   corps, nom, chevron inerte). En dessous, « Autres séances recommandées »
   : la liste ordonnée actuelle (numéro, nom, cette semaine n/m, Monter /
   Descendre / Retirer, « + Ajouter une séance » avec la modale existante).
   Fonctionnalités inchangées, seulement restylées.
5. **Messages** : inchangé, tokens § 2.
6. **Condition & situation déclarée** : `<details>` inchangé, tokens § 2.
7. Bandeau vert `ok-soft` « Séance ajustée — le patient a été prévenu. »
   quand `?adjusted=1`.

## 7. Ajuster la séance (nouveau)

### 7.1 Interface — `components/AdjustWorkoutModal.tsx` (client)

Ouverte par le bouton § 6.1, sur la séance « en cours ». Modale large
(max 880 px) :

- Titre « Ajuster la séance » + sous-titre « {nom de la séance} — les
  modifications ne concernent que {prénom du patient}. »
- **Colonne gauche « Exercices actuels »** : lignes icône + nom + coche.
  Clic → la ligne passe en `danger-soft` avec « À retirer » et une croix ;
  re-clic annule.
- **Colonne droite « Ajouter un exercice »** : recherche, liste groupée
  par zone du corps (réutilise `lib/exercise/category.ts`, exclut les
  exercices masqués par le kiné et ceux déjà dans la séance), bouton
  « + » → la ligne passe en `ok-soft` avec « À ajouter ».
- **Résumé des modifications** : deux puces « N exercice(s) retiré(s) »
  (rouge pâle) et « M ajouté(s) » (vert pâle), affichées dès que N ou M > 0.
- **Annuler** (ferme sans rien envoyer) / **Enregistrer les modifications**
  (`brand`, désactivé si N = M = 0, « Enregistrement… » pendant l'envoi).
- Fermeture : croix, clic hors, Échap. Focus piégé dans la modale.

### 7.2 Mécanique — copie personnelle

Numéro effectif : 0044 (0042 et 0043 étaient déjà pris).

Une séance ajustée pour un patient devient **sa** séance : une copie de la
séance d'origine, rattachée à lui, invisible ailleurs.

**Migration `supabase/migrations/0044_patient_workouts.sql`** :

```sql
alter table public.workouts
  add column if not exists patient_id uuid references public.patients (id) on delete cascade,
  add column if not exists source_workout_id uuid references public.workouts (id) on delete set null;
create index if not exists idx_workouts_patient on public.workouts (patient_id) where patient_id is not null;

-- Lecture : séances de la plateforme et des cabinets (patient_id null),
-- ma propre copie (patient), ou la copie d'un de mes patients (kiné).
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

-- Insertion : toujours créateur = moi et kiné ; si la séance est rattachée
-- à un patient, ce patient doit être le mien.
drop policy if exists workouts_insert_owner on public.workouts;
create policy workouts_insert_owner on public.workouts
  for insert to authenticated
  with check (
    created_by = public.current_app_user_id()
    and exists (select 1 from public.instructors i where i.id = public.current_app_user_id())
    and (patient_id is null
         or exists (select 1 from public.patients p
                    where p.id = patient_id
                      and p.instructor_id = public.current_app_user_id()))
  );

-- Les exercices d'une séance suivent la visibilité de la séance.
drop policy if exists workout_ex_select_all on public.workout_exercises;
drop policy if exists workout_ex_select_visible on public.workout_exercises;
create policy workout_ex_select_visible on public.workout_exercises
  for select to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_exercises.workout_id
      and (w.patient_id is null
           or w.patient_id = public.current_app_user_id()
           or exists (select 1 from public.patients p
                      where p.id = w.patient_id
                        and p.instructor_id = public.current_app_user_id()))
  ));
```

En clair, pour Philippe : aujourd'hui **tout utilisateur connecté peut
lire toutes les séances**. Après cette migration, une séance rattachée à un
patient n'est lisible que par ce patient et par son kiné ; les séances de
la plateforme et des cabinets restent lisibles par tous comme avant. Les
règles de modification/suppression (créateur uniquement) ne changent pas.
Le trigger de la migration 0038 (nettoyage des séances plateforme vides)
ne concerne que `created_by is null`, donc jamais une copie.

**Action serveur `adjustPatientWorkout`** (`app/dashboard/patients/[id]/actions.ts`),
champs : `patient_id`, `workout_id`, `remove_ids[]`, `add_ids[]`
(identifiants d'exercices) :

1. `requireUser` ; charger la séance (`id, name, description, condition_id,
   stage, duration_minutes, times_per_week, patient_id`). Vérifier que le
   patient appartient au kiné (RLS le garantit ; on redirige avec une
   erreur lisible si la lecture échoue).
2. Si `workout.patient_id !== patient_id` : insérer la copie (mêmes champs,
   `created_by = kiné`, `patient_id`, `source_workout_id = workout.id`),
   copier `workout_exercises`, puis mettre à jour la ligne de
   `patient_recommended_workouts` (`patient_id`, `workout_id = original`)
   pour pointer vers la copie, même `priority`. Sinon, cible = la séance.
3. Supprimer de la cible les `remove_ids`, insérer les `add_ids` en fin,
   renuméroter `position` 0…n-1.
4. Si N + M > 0 : insérer dans `patient_messages` (`sender = 'instructor'`)
   : « J'ai ajusté votre séance « {nom} » : {N} exercice(s) retiré(s),
   {M} ajouté(s). » (chaque partie omise si 0).
5. `revalidatePath` fiche, `/patient`, `/patient/seance-du-jour` ;
   redirection fiche `?adjusted=1`. Erreur → `?error=`.

**Effets ailleurs** :
- « Mes séances » (`seances/page.tsx`), la modale « Ajouter une séance »
  et le pool de la fiche filtrent `patient_id is null`.
- `deleteSeance` : inchangé (une copie n'apparaît pas dans la liste).
  Une copie disparaît avec le patient (cascade) ; si le kiné retire la
  recommandation, la copie reste en base, invisible — accepté.
- Côté patient : aucun changement de code, il lit la copie via ses
  recommandations. Le message automatique apparaît comme un message non
  lu du kiné.
- Limite assumée : `weekCount` est compté par `workout_id`, donc le
  compteur « cette semaine » repart de zéro pour la copie la semaine de
  l'ajustement.

## 8. Mes séances et Mes exercices — restyle

Aucune fonctionnalité ajoutée ni retirée. Changements :
- En-tête commun : titre + sous-titre à gauche, action principale à
  droite (« + Nouvelle séance », « + Ajouter un nouvel exercice »).
- Onglets « Mes séances personnalisées / Séances prévues » → segmenté § 5.
- Cartes blanches `rounded-xl`, bordure `line`, badges de phase § 2,
  corbeille et confirmation en ligne conservées.
- Tuiles de zones du corps : même carte ; active = bordure `brand` + fond
  `brand-soft`.
- `ExerciseVideoUpload`, `DocumentUpload` : tokens § 2 (fin de la palette
  slate).
- `PatientIntake.tsx` (orphelin) et `KineMockup.tsx` (si non importé) sont
  supprimés.

## 9. Page d'accueil — section « Côté kiné » (`app/page.tsx`)

Remplace la section actuelle (`KineDemoMockup`). Structure, dans l'ordre :

1. Eyebrow « CÔTÉ KINÉ » (bleu, petites capitales), titre inchangé
   « De son tableau de bord à la fiche de chaque patient. », sous-titre
   « Tout ce qui se passe entre deux séances, en un coup d'œil.
   Comprendre, décider, ajuster : 2 clics suffisent. »
2. Trois arguments en ligne, icône lucide dans une pastille `brand-soft` :
   **Tout voir** — « Assiduité, phases, dernières séances et signaux
   importants. » (`Eye`) · **Comprendre vite** — « Ouvrez le suivi
   détaillé, l'historique de douleur et l'adhérence. » (`Zap`) ·
   **Agir immédiatement** — « Ajustez le programme en quelques clics, le
   patient voit le changement aussitôt. » (`PenSquare`).
3. **Démo** — `components/KineJourneyDemo.tsx` (client). Conteneur qui
   déborde de la colonne de texte (`max-w-7xl`, ≈ 1 200 px), carte blanche
   arrondie. En haut : pilule « Démo interactive » + « Regardez le
   parcours, du tableau de bord à l'ajustement. » Puis trois panneaux côte
   à côte, reliés par des flèches, chacun avec un numéro bleu et un titre :
   **1 Dashboard — Ce qui compte aujourd'hui** · **2 Patient — Comprendre
   le suivi** · **3 Action — Ajuster en deux clics**. Les panneaux sont des
   maquettes statiques simplifiées des vrais écrans § 4, § 6, § 7 (mêmes
   tokens, mêmes textes), avec la distribution actuelle : kiné Julien,
   patients Claire D. (séance faite), Marc T. (douleur 5/10, prothèse
   genou, phase 1), Sophie R. (inactive 4 jours), Paul M., Julie L.
4. **Chorégraphie** (boucle ≈ 12 s, curseur `Cursor` de
   `KineDemoScreens` réutilisé, positions mesurées sur les éléments) :
   repos (panneaux 2 et 3 à 45 % d'opacité) → curseur sur Marc T., clic,
   ligne surlignée → panneau 2 à 100 % → curseur sur « Ajuster la
   séance », clic → panneau 3 à 100 % → clic sur « Squat assisté » (ligne
   « À retirer ») → clic sur « Enregistrer les modifications » → résumé
   « 1 retiré · 1 ajouté » puis bandeau bas → pause 2,5 s → retour au
   repos. `prefers-reduced-motion` : les trois panneaux à 100 %, sans
   curseur, bandeau visible.
5. **Bandeau bas** : icône téléphone, « Le patient verra son nouveau
   programme dès sa prochaine connexion. » → flèche → puce blanche
   « Programme mis à jour par votre kiné · ✓ Nouvelle séance disponible ».
6. Sous 1024 px : panneaux empilés, flèches verticales, pas de curseur.
7. CTA « Créer un compte praticien » sous la démo (conservé).

`KineDemoMockup.tsx` est supprimé ; `KineDemoScreens.tsx` ne garde que
`Cursor`, `useReducedMotion` et ce que la démo réutilise.

## 10. Documents à mettre à jour dans la même livraison

- `CLAUDE.md` : § 3 (retirer `exercise_overrides`, `exercise_feedback`,
  `autoEase.ts` — supprimés en 0036 ; ajouter `workouts.patient_id`) ;
  § 4 patient (« adaptive difficulty via autoEase » → « frein de phase via
  `stageProgress.ts` ») ; § 5 (« Analytics/adherence charts » n'est plus
  hors périmètre : adhérence %, tuiles avec variation, historique douleur
  existent) ; ajouter « Ajuster la séance » au flux kiné.
- `PRODUCT.md` : même correction de périmètre ; « 478 exercices » → 437.
- `DESIGN.md` : fin des deux registres côté app — une palette (§ 2) ;
  Fraunces vitrine uniquement ; sidebar sombre.
- `docs/superpowers/specs/2026-09-02-dashboard-redesign-design.md` :
  note « Remplacée » en tête (les idées « messages non lus » et
  « Encourager » ne sont pas reprises ; à ré-évaluer plus tard).

## 11. Vérification

- À chaque lot : `npx tsc --noEmit` et `npm run lint` (adapter aux scripts
  réels de `package.json`).
- Tests unitaires (Vitest si présent, sinon `node --test` sur des modules
  purs) pour `computeAdherence`, `computeSignal`, `relativeDay`, et la
  renumérotation des positions.
- Migration 0044 : Philippe l'applique lui-même ; vérification manuelle
  ensuite avec sa session patient (ne voit que ses copies) et une session
  kiné (ne voit pas les copies d'un autre cabinet).
- Smoke test navigateur (Chrome) des quatre pages kiné + accueil, desktop
  et 390 px.

## 12. Ordre d'exécution

- **Lot 0** (séquentiel, d'abord) : tokens § 2, sidebar § 3, layout
  dashboard (fond, suppression halo/grain), modules partagés
  (`adherence.ts`, `patientSignal.ts`, `relativeDay.ts`) + tests.
- Puis en parallèle : **A** Mes patients § 5 · **B** Tableau de bord § 4 ·
  **C** Page d'accueil § 9 · **D** migration + action + modale + fiche
  § 6–7 · **E** restyle § 8.
- **Lot F** : documents § 10, revue croisée, smoke test.

## 13. Hors périmètre

Sélecteur de date sur le tableau de bord ; pages Paramètres / Aide ;
notifications autres que le message automatique ; ajustement par jour
(la maquette dit « pour le jour sélectionné » — non retenu : l'ajustement
vaut pour la séance du patient, pas pour une date) ; réutilisation des
idées « messages non lus » et « Encourager » de la spec du 2026-09-02 ;
tout changement côté patient au-delà du message automatique.
