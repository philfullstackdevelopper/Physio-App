"use client";

import { useMemo, useState } from "react";
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
// passe à l'orange si ce patient n'a pas ce matériel chez lui, une ligne
// rappelle ce qu'il a déclaré, et un bouton n'affiche que les exercices
// faisables. On signale, on ne bloque jamais : le kiné reste seul juge.
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
  const [feasibleOnly, setFeasibleOnly] = useState(false);
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
    // « Faisable avec son matériel » : on retire ce pour quoi il manque quelque chose.
    return feasibleOnly ? base.filter((ex) => missingEquipment(ex.equipment, patientEquipment).length === 0) : base;
  }, [exercises, bodyPartId, query, feasibleOnly, patientEquipment]);

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
          <button
            type="button"
            onClick={() => setFeasibleOnly((v) => !v)}
            aria-pressed={feasibleOnly}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              feasibleOnly ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:bg-app-bg"
            }`}
          >
            <span className="max-sm:hidden">Faisable avec son matériel</span>
            <span className="sm:hidden">Faisable chez lui</span>
          </button>
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
            {feasibleOnly && " Le filtre « faisable avec son matériel » est actif."}
          </p>
        )}
        {/* Lignes compactes, sur 2 colonnes en grand écran. */}
        <div className="grid content-start gap-1.5 max-sm:grid-cols-2 max-sm:gap-2 lg:grid-cols-2">
          {filtered.map((ex) => {
            const marked = selectedIds.has(ex.id);
            const required = equipmentListLabel(ex.equipment ?? []);
            const missing = missingEquipment(ex.equipment, patientEquipment);
            return (
              // Deux boutons côte à côte dans la même ligne (un bouton ne peut
              // pas en contenir un autre) : la ligne ajoute/retire l'exercice,
              // le petit (i) ouvre sa démonstration (Philippe, 2026-10-10).
              <div
                key={ex.id}
                className={`flex w-full min-w-0 items-center rounded-lg border text-sm transition-colors max-sm:relative max-sm:rounded-xl ${
                  marked ? "border-ok/30 bg-ok-soft text-ok" : "border-line bg-surface text-ink hover:border-brand/40 hover:bg-app-bg"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggle(ex.id)}
                  title={ex.name}
                  aria-pressed={marked}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-l-lg py-1 pl-2 pr-1 text-left max-sm:flex-col max-sm:gap-1.5 max-sm:rounded-xl max-sm:p-2.5 max-sm:text-center"
                >
                  <ExerciseIllustration name={ex.name} animate={false} className={`h-7 w-7 shrink-0 max-sm:h-16 max-sm:w-full ${marked ? "text-ok" : "text-brand"}`} />
                  <span className="flex-1 truncate max-sm:line-clamp-2 max-sm:min-h-[2.5em] max-sm:flex-none max-sm:whitespace-normal max-sm:text-[13px] max-sm:leading-tight">{ex.name}</span>
                  {/* Matériel indispensable : orange s'il manque à ce patient. */}
                  {required && (
                    <span
                      title={
                        missing.length > 0
                          ? `Matériel que ${patientFirstName ?? "le patient"} n'a pas déclaré : ${equipmentListLabel(missing)}`
                          : `Matériel nécessaire : ${required}`
                      }
                      className={`max-w-[45%] shrink-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium no-underline max-sm:max-w-full ${
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
                  className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand max-sm:absolute max-sm:right-1 max-sm:top-1 max-sm:mr-0 max-sm:h-8 max-sm:w-8"
                >
                  <Info className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {info && <ExerciseInfoModal exercise={info} onClose={() => setInfo(null)} />}
    </section>
  );
}
