"use client";

import { Fragment, useMemo, useState } from "react";
import { Check, Dumbbell, Info, Plus, Search } from "lucide-react";
import { type BodyPart } from "@/lib/exercise/category";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import BodyPartIllustration from "@/components/BodyPartIllustration";
import ExerciseInfoModal from "@/components/ExerciseInfoModal";
import { EQUIPMENT_LABELS, equipmentListLabel, missingEquipment, type EquipmentId } from "@/lib/exercise/equipment";

export type PickerExercise = {
  id: string;
  name: string;
  bodyPartIds: string[];
  searchKeywords?: string[] | null;
  /** Matériel indispensable (exercises.equipment, migration 0065). Vide = aucun. */
  equipment?: string[] | null;
};

// La colonne de droite « Ajouter un exercice », partagée par les deux fenêtres
// qui composent une séance : « Ajuster la séance » d'un patient
// (AdjustWorkoutModal) et « Nouvelle séance » (NewSeanceModal) — Philippe,
// 2026-10-02 : même format aux deux endroits.
//
// Recherche (nom + mots-clés français) OU catégorie : une recherche non vide
// cherche dans TOUTE la bibliothèque, sans tenir compte de la catégorie.
// Catégories : une case par zone, toutes sur une ligne et de même largeur,
// icône au-dessus du libellé, nombre d'exercices au survol ; sur téléphone la
// ligne défile. L'état (recherche, catégorie) est local : il repart de zéro à
// chaque ouverture de la fenêtre, qui remonte ce composant.
//
// Matériel (Philippe, 2026-10-12) : chaque exercice qui demande du matériel
// porte une pastille qui le nomme. Quand le sélecteur est ouvert POUR UN
// PATIENT (`patientEquipment` fourni — « Ajuster la séance »), la pastille
// passe à l'orange si ce patient n'a pas ce matériel chez lui et une ligne
// rappelle ce qu'il a déclaré. Le tri est AUTOMATIQUE, sans bouton (Philippe,
// 2026-10-12, 2e retour : « se baser sur les renseignements du patient ») :
// les exercices faisables d'abord, ceux pour lesquels il lui manque du
// matériel tout en bas sous un intertitre — comme les inscriptions en attente
// au bas de « Mes patients ». Ils restent sélectionnables : le kiné décide.
export default function ExerciseLibraryPicker({
  exercises,
  bodyParts,
  selectedIds,
  onToggle,
  patientEquipment = null,
  patientFirstName,
}: {
  exercises: PickerExercise[];
  bodyParts: BodyPart[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  /** Matériel déclaré par le patient (onboarding). null = pas de patient, ou inconnu : aucun signalement. */
  patientEquipment?: string[] | null;
  patientFirstName?: string;
}) {
  const knowsEquipment = patientEquipment !== null;
  const ownedLabel = (patientEquipment ?? [])
    .filter((id) => id !== "aucun")
    .map((id) => EQUIPMENT_LABELS[id as EquipmentId] ?? id)
    .join(", ");
  const countByBodyPart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ex of exercises) for (const bpId of ex.bodyPartIds) counts.set(bpId, (counts.get(bpId) ?? 0) + 1);
    return counts;
  }, [exercises]);

  const [q, setQ] = useState("");
  const [bodyPartId, setBodyPartId] = useState<string | null>(
    () => bodyParts.find((bp) => (countByBodyPart.get(bp.id) ?? 0) > 0)?.id ?? bodyParts[0]?.id ?? null,
  );
  const query = q.trim().toLowerCase();
  // Exercice dont la démonstration est ouverte (petit bouton (i) de chaque ligne).
  const [info, setInfo] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    const base = query
      ? exercises.filter(
          (ex) => ex.name.toLowerCase().includes(query) || (ex.searchKeywords ?? []).some((k) => k.toLowerCase().includes(query)),
        )
      : bodyPartId
        ? exercises.filter((ex) => ex.bodyPartIds.includes(bodyPartId))
        : [];
    // Faisables d'abord, « matériel manquant » ensuite (ordre alphabétique conservé dans chaque groupe).
    const blocked = (ex: PickerExercise) => missingEquipment(ex.equipment, patientEquipment).length > 0;
    return [...base.filter((ex) => !blocked(ex)), ...base.filter(blocked)];
  }, [exercises, bodyPartId, query, patientEquipment]);
  // Premier exercice « matériel manquant » : l'intertitre se place juste avant.
  const firstBlockedId = filtered.find((ex) => missingEquipment(ex.equipment, patientEquipment).length > 0)?.id ?? null;

  return (
    <section className="flex min-h-0 min-w-0 flex-col">
      {/* Titre et recherche sur la même ligne, cases de catégories plus
          basses : la liste d'exercices récupère la hauteur (Philippe,
          2026-10-02 : « encore plus de place pour choisir »). */}
      <div className="flex items-center gap-3">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted max-sm:hidden">Ajouter un exercice</p>
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un exercice…"
            className="w-full rounded-lg border border-line bg-surface py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </label>
      </div>
      {/* Matériel du patient + filtre — seulement quand on compose pour un patient. */}
      {knowsEquipment && (
        <div className="mt-2 flex items-center gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted" title={ownedLabel || "Aucun matériel déclaré"}>
            <Dumbbell className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">
              {patientFirstName ? `Matériel de ${patientFirstName}` : "Son matériel"} : <span className="font-medium text-ink">{ownedLabel || "aucun"}</span>
            </span>
          </p>
        </div>
      )}
      {!query && (
        <div
          style={{ gridTemplateColumns: `repeat(${bodyParts.length}, minmax(0, 1fr))` }}
          className="mt-2 flex gap-1 overflow-x-auto max-sm:-mx-4 max-sm:gap-2 max-sm:px-4 max-sm:pb-1 max-sm:[scrollbar-width:none] md:grid md:overflow-visible"
        >
          {bodyParts.map((bp) => {
            const active = bp.id === bodyPartId;
            const count = countByBodyPart.get(bp.id) ?? 0;
            return (
              <button
                key={bp.id}
                type="button"
                title={`${bp.label} — ${count} exercice${count > 1 ? "s" : ""}`}
                onClick={() => setBodyPartId(bp.id)}
                disabled={count === 0}
                className={`flex w-20 shrink-0 flex-col items-center rounded-xl border px-1 py-0.5 text-center text-[10px] font-medium leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-40 max-sm:w-[5.5rem] max-sm:gap-1 max-sm:rounded-2xl max-sm:px-1.5 max-sm:py-2 max-sm:text-xs md:w-auto md:min-w-0 ${
                  active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:bg-app-bg"
                }`}
              >
                <BodyPartIllustration slug={bp.slug} className="h-6 w-6 shrink-0 max-sm:h-11 max-sm:w-11" active={active} />
                <span className="line-clamp-2">{bp.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-2 max-h-80 overflow-y-auto pr-1 max-sm:max-h-none max-sm:min-h-0 max-sm:flex-1 md:min-h-0 md:max-h-none md:flex-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted">
            {query ? `Aucun exercice ne correspond à « ${q.trim()} ».` : "Aucun exercice dans cette catégorie."}
          </p>
        )}
        {/* Blocs (dessin au-dessus du nom) sur tous les formats : 2 par rangée
            sur téléphone, 3 sur ordinateur avec un dessin plus grand (Philippe,
            2026-10-12 : « les exercices sont affichés trop petit » — avant,
            l'ordinateur avait des lignes compactes avec une vignette de 28 px). */}
        <div className="grid grid-cols-2 content-start gap-2 lg:grid-cols-3">
          {filtered.map((ex) => {
            const marked = selectedIds.has(ex.id);
            const required = equipmentListLabel(ex.equipment ?? []);
            const missing = missingEquipment(ex.equipment, patientEquipment);
            return (
              // Deux boutons côte à côte dans la même ligne (un bouton ne peut
              // pas en contenir un autre) : la ligne ajoute/retire l'exercice,
              // le petit (i) ouvre sa démonstration (Philippe, 2026-10-10).
              <Fragment key={ex.id}>
              {ex.id === firstBlockedId && (
                <p className="col-span-full mt-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-warn first:mt-0">
                  <span className="shrink-0">Matériel que {patientFirstName ?? "le patient"} n'a pas</span>
                  <span className="h-px flex-1 bg-warn/25" />
                </p>
              )}
              <div
                className={`relative flex w-full min-w-0 items-stretch rounded-xl border text-sm transition-colors ${
                  marked ? "border-ok/30 bg-ok-soft text-ok" : "border-line bg-surface text-ink hover:border-brand/40 hover:bg-app-bg"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggle(ex.id)}
                  title={ex.name}
                  aria-pressed={marked}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl p-2.5 text-center"
                >
                  <ExerciseIllustration name={ex.name} className={`h-16 w-full shrink-0 sm:h-24 ${marked ? "text-ok" : "text-brand"}`} />
                  <span className="line-clamp-2 min-h-[2.5em] text-[13px] leading-tight sm:text-sm sm:leading-tight">{ex.name}</span>
                  {/* Matériel indispensable : orange s'il manque à ce patient. */}
                  {required && (
                    <span
                      title={
                        missing.length > 0
                          ? `Matériel que ${patientFirstName ?? "le patient"} n'a pas : ${equipmentListLabel(missing)}`
                          : `Matériel nécessaire : ${required}`
                      }
                      className={`max-w-full shrink-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium no-underline ${
                        missing.length > 0 ? "bg-warn-soft text-warn" : "bg-app-bg text-muted"
                      }`}
                    >
                      {missing.length > 0 ? equipmentListLabel(missing) : required}
                    </span>
                  )}
                  {marked ? <Check className="h-4 w-4 shrink-0" strokeWidth={2} /> : <Plus className="h-4 w-4 shrink-0 text-brand" strokeWidth={2} />}
                </button>
                <button
                  type="button"
                  onClick={() => setInfo({ id: ex.id, name: ex.name })}
                  aria-label={`Voir la démonstration : ${ex.name}`}
                  title="Voir la démonstration"
                  className="absolute right-1 top-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <Info className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              </Fragment>
            );
          })}
        </div>
      </div>
      {info && <ExerciseInfoModal exercise={info} onClose={() => setInfo(null)} />}
    </section>
  );
}
