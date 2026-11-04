"use client";

// =============================================================================
// Créer un exercice, en trois étapes (Philippe, 2026-11-04, idée de Jonathan
// Feltus) :
//   1. Le mouvement — nom (avec « cet exercice existe peut-être déjà »),
//      zones, matériel, consignes étape par étape ;
//   2. La vidéo — filmée au téléphone, conseils pour une caméra posée et
//      stable, accord de la personne filmée ;
//   3. Pour qui ? — sa banque ou un seul patient, et « Rendre public pour
//      tous » (vérifié par EasyPhysio), avec la récompense des 5 exercices.
// Repris de wger (assistant en étapes, recherche de doublons) et de
// free-exercise-db (consignes en liste d'étapes).
// =============================================================================

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, Camera, Upload, Globe, User, BookOpen, Check } from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import { EXERCISE_EQUIPMENT_LABELS, EXERCISE_EQUIPMENT_OPTIONS } from "@/lib/exercise/equipment";
import { parseSteps } from "@/lib/exercise/steps";
import { contributorTitle, nextContributorStep, similarExercises } from "@/lib/exercise/kineExercises";
import { createKineExercise } from "@/app/dashboard/exercises/actions";
import { FilmingTips, checkVideoFile, uploadKineVideo } from "@/components/KineVideoUpload";

export interface WizardBodyPart {
  id: string;
  label: string;
}
export interface WizardLibraryExercise {
  id: string;
  name: string;
  instructions: string | null;
  bodyPartIds: string[];
  equipment: string[];
  search_keywords: string[];
  hasVideo: boolean;
}
export interface WizardPatient {
  id: string;
  name: string;
}

const STEP_TITLES = ["Le mouvement", "La vidéo", "Pour qui ?"] as const;

export default function NewExerciseWizard({
  bodyParts,
  library,
  patients,
  defaultBodyPartId,
  publishedCount,
  onClose,
  demo = false,
}: {
  bodyParts: WizardBodyPart[];
  /** Exercices de la plateforme et publiés : pour la recherche de doublons. */
  library: WizardLibraryExercise[];
  patients: WizardPatient[];
  defaultBodyPartId: string | null;
  /** Exercices de ce kiné déjà publiés (récompense). */
  publishedCount: number;
  onClose: () => void;
  /** Démo publique (/demo/kine) : tout le formulaire fonctionne, rien n'est enregistré. */
  demo?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [demoDone, setDemoDone] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState<WizardLibraryExercise | null>(null);
  const [dupDismissed, setDupDismissed] = useState(false);
  const [bodyPartIds, setBodyPartIds] = useState<string[]>(defaultBodyPartId ? [defaultBodyPartId] : []);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [steps, setSteps] = useState<string[]>(["", ""]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [scope, setScope] = useState<"bank" | "patient">("bank");
  const [patientId, setPatientId] = useState<string>("");
  const [makePublic, setMakePublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  const similar = useMemo(
    () => (source || dupDismissed || name.trim().length < 4 ? [] : similarExercises(name, library)),
    [name, library, source, dupDismissed],
  );

  const startFrom = (ex: WizardLibraryExercise) => {
    setSource(ex);
    setName(`${ex.name} (variante)`);
    setBodyPartIds(ex.bodyPartIds.length ? ex.bodyPartIds : bodyPartIds);
    setEquipment(ex.equipment);
    const s = parseSteps(ex.instructions);
    setSteps(s.length ? s : ["", ""]);
  };

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const chooseVideo = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    const problem = checkVideoFile(f);
    if (problem) {
      setError(problem);
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(f);
    setVideoPreview(URL.createObjectURL(f));
  };

  const step1Problem =
    name.trim().length < 3 ? "Donnez un nom à l'exercice." : bodyPartIds.length === 0 ? "Choisissez au moins une zone du corps." : null;
  const step2Problem = video && !consent ? "Cochez l'accord de la personne filmée, ou retirez la vidéo." : null;
  const step3Problem = scope === "patient" && !patientId ? "Choisissez le patient." : null;

  const next = () => {
    const problem = step === 0 ? step1Problem : step === 1 ? step2Problem : null;
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((s) => Math.min(2, s + 1));
  };

  const submit = async () => {
    const problem = step1Problem ?? step2Problem ?? step3Problem;
    if (problem) {
      setError(problem);
      return;
    }
    if (demo) {
      setDemoDone(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createKineExercise({
        name,
        steps,
        bodyPartIds,
        equipment,
        scope,
        patientId: scope === "patient" ? patientId : null,
        makePublic: scope === "bank" && makePublic,
        sourceExerciseId: source?.id ?? null,
      });
      if ("error" in res) throw new Error(res.error);
      if (video) {
        setProgress(0);
        try {
          await uploadKineVideo(res.id, video, consent, setProgress);
        } catch (e) {
          // L'exercice existe déjà : on le dit, la vidéo pourra être renvoyée
          // depuis sa fiche.
          router.refresh();
          setError(
            `L'exercice est créé, mais la vidéo n'a pas pu être envoyée : ${e instanceof Error ? e.message : "erreur"}. Vous pourrez la renvoyer depuis sa fiche.`,
          );
          setBusy(false);
          setProgress(null);
          return;
        }
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const chip =
    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors duration-150";
  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="new-ex-title">
      <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-surface shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl max-sm:rounded-t-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 id="new-ex-title" className="text-base font-semibold text-ink">
            Créer un exercice
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-app-bg hover:text-ink">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <ol className="flex gap-1.5 px-5 pt-3">
          {STEP_TITLES.map((t, i) => (
            <li
              key={t}
              className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs ${
                i === step ? "border-brand bg-brand-soft font-semibold text-brand" : i < step ? "border-line text-ink" : "border-line text-muted"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {i < step && <Check className="h-3 w-3" strokeWidth={3} />}
                {i + 1}. {t}
              </span>
            </li>
          ))}
        </ol>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">Nom de l&apos;exercice</span>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setDupDismissed(false);
                  }}
                  placeholder="Ex. : Pont fessier sur une jambe avec élastique"
                  className={field}
                  autoFocus
                />
              </label>

              {source && (
                <p className="rounded-lg bg-ok-soft p-2.5 text-sm text-ink">
                  Vous partez de <b>{source.name}</b>
                  {source.hasVideo ? " : sa vidéo est reprise, vous pourrez filmer la vôtre à l'étape suivante." : "."}{" "}
                  <button type="button" onClick={() => setSource(null)} className="font-medium text-brand hover:underline">
                    Ne pas partir de cet exercice
                  </button>
                </p>
              )}

              {similar.length > 0 && (
                <div className="rounded-xl border border-warn/40 bg-warn-soft p-3">
                  <p className="text-sm font-semibold text-ink">Cet exercice existe peut-être déjà :</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {similar.map((ex) => (
                      <li key={ex.id} className="flex items-center gap-3 rounded-lg bg-surface p-2">
                        <ExerciseIllustration name={ex.name} className="h-12 w-14 shrink-0 text-brand" />
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="block font-medium text-ink">{ex.name}</span>
                          <span className="text-xs text-muted">{ex.hasVideo ? "Avec vidéo" : "Dessin seulement"}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => startFrom(ex)}
                          className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-app-bg"
                        >
                          Partir de cet exercice
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => setDupDismissed(true)} className="mt-2 text-xs font-medium text-brand hover:underline">
                    Non, c&apos;est un nouvel exercice
                  </button>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted">Zones du corps</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {bodyParts.map((bp) => {
                    const on = bodyPartIds.includes(bp.id);
                    return (
                      <button
                        key={bp.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setBodyPartIds((l) => toggle(l, bp.id))}
                        className={`${chip} ${on ? "border-brand bg-brand-soft text-brand" : "border-line text-ink"}`}
                      >
                        {bp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted">Matériel indispensable (laissez vide si aucun)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EXERCISE_EQUIPMENT_OPTIONS.map((id) => {
                    const on = equipment.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setEquipment((l) => toggle(l, id))}
                        className={`${chip} ${on ? "border-brand bg-brand-soft text-brand" : "border-line text-ink"}`}
                      >
                        {EXERCISE_EQUIPMENT_LABELS[id]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted">Consignes, étape par étape</p>
                <p className="mt-0.5 text-xs text-muted">Le patient les verra numérotées pendant sa séance.</p>
                <ol className="mt-2 flex flex-col gap-2">
                  {steps.map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">{i + 1}</span>
                      <input
                        value={s}
                        onChange={(e) => setSteps((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                        placeholder={i === 0 ? "Ex. : Allongé sur le dos, élastique au-dessus des genoux" : "Étape suivante"}
                        className={field}
                      />
                      {steps.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Retirer l'étape ${i + 1}`}
                          onClick={() => setSteps((l) => l.filter((_, j) => j !== i))}
                          className="shrink-0 rounded p-1.5 text-muted hover:bg-app-bg hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
                {steps.length < 12 && (
                  <button
                    type="button"
                    onClick={() => setSteps((l) => [...l, ""])}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2} /> Ajouter une étape
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <FilmingTips />
              {videoPreview ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <video src={videoPreview} controls muted playsInline className="max-h-72 w-full rounded-xl bg-ink object-contain sm:w-56" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <p className="text-sm text-ink">
                      <b>{video?.name}</b> ({Math.max(1, Math.round((video?.size ?? 0) / 1024 / 1024))} Mo)
                    </p>
                    <p className="text-xs text-muted">
                      La vidéo sera lue sans le son. Si elle est trop longue, coupez le début et la fin dans l&apos;application Photos de votre
                      téléphone avant de l&apos;envoyer.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (videoPreview) URL.revokeObjectURL(videoPreview);
                        setVideo(null);
                        setVideoPreview(null);
                        setConsent(false);
                      }}
                      className="self-start text-sm font-medium text-danger hover:underline"
                    >
                      Retirer la vidéo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
                  >
                    <Camera className="h-4 w-4" strokeWidth={2} /> Filmer maintenant
                  </button>
                  <button
                    type="button"
                    onClick={() => pickRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-app-bg"
                  >
                    <Upload className="h-4 w-4" strokeWidth={2} /> Choisir une vidéo
                  </button>
                  <input ref={cameraRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => chooseVideo(e.target.files?.[0])} />
                  <input ref={pickRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => chooseVideo(e.target.files?.[0])} />
                </div>
              )}
              {video && (
                <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm text-ink">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-brand" />
                  <span>
                    <b>La personne filmée a donné son accord</b> pour que cette vidéo soit montrée aux patients
                    {makePublic && scope === "bank" ? ", et aux kinés d'EasyPhysio si l'exercice devient public" : ""}. (Obligatoire.)
                  </span>
                </label>
              )}
              {!video && (
                <p className="text-sm text-muted">
                  Pas de vidéo ? Vous pouvez continuer :{" "}
                  {source?.hasVideo ? "la vidéo de l'exercice repris sera utilisée." : "le patient verra le nom et les consignes, et vous pourrez filmer plus tard."}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setScope("bank")}
                aria-pressed={scope === "bank"}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left ${scope === "bank" ? "border-brand bg-brand-soft" : "border-line"}`}
              >
                <BookOpen className={`mt-0.5 h-5 w-5 shrink-0 ${scope === "bank" ? "text-brand" : "text-muted"}`} strokeWidth={2} />
                <span>
                  <span className="block font-semibold text-ink">Ma banque</span>
                  <span className="text-sm text-muted">Utilisable dans les séances de tous mes patients.</span>
                </span>
              </button>
              <div className={`rounded-xl border p-3 ${scope === "patient" ? "border-brand bg-brand-soft" : "border-line"}`}>
                <button type="button" onClick={() => setScope("patient")} aria-pressed={scope === "patient"} className="flex w-full items-start gap-3 text-left">
                  <User className={`mt-0.5 h-5 w-5 shrink-0 ${scope === "patient" ? "text-brand" : "text-muted"}`} strokeWidth={2} />
                  <span>
                    <span className="block font-semibold text-ink">Seulement pour un patient</span>
                    <span className="text-sm text-muted">Un exercice sur mesure : vous le trouverez dans « Ajuster la séance » de ce patient.</span>
                  </span>
                </button>
                {scope === "patient" && (
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className={`${field} mt-3`}
                    aria-label="Patient"
                  >
                    <option value="">Choisir le patient…</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
                {scope === "patient" && patients.length === 0 && <p className="mt-2 text-sm text-muted">Vous n&apos;avez pas encore de patient.</p>}
              </div>

              {scope === "bank" && (
                <label className="flex items-start gap-3 rounded-xl border-[1.5px] border-ok bg-ok-soft p-3">
                  <input type="checkbox" checked={makePublic} onChange={(e) => setMakePublic(e.target.checked)} className="mt-1 h-4 w-4 accent-ok" />
                  <span className="text-sm text-ink">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Globe className="h-4 w-4 text-ok" strokeWidth={2} /> Rendre public pour tous les kinés d&apos;EasyPhysio
                    </span>
                    <span className="mt-0.5 block">
                      Vous l&apos;utilisez dès maintenant. EasyPhysio le vérifie, puis lui crée gratuitement un dessin animé. Votre nom
                      s&apos;affichera comme auteur.
                    </span>
                    <span className="mt-1.5 block text-xs text-muted">
                      {contributorTitle(publishedCount)
                        ? `Vous êtes « ${contributorTitle(publishedCount)} » (${publishedCount} exercices publiés).`
                        : `${publishedCount} exercice${publishedCount > 1 ? "s" : ""} publié${publishedCount > 1 ? "s" : ""}. ${nextContributorStep(publishedCount) ?? ""}`}
                    </span>
                  </span>
                </label>
              )}
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          {demoDone && (
            <p className="mt-4 rounded-lg bg-ok-soft p-3 text-sm text-ink">
              C&apos;est tout : dans l&apos;appli, l&apos;exercice serait créé
              {scope === "patient" ? " pour ce patient" : makePublic ? " et envoyé à EasyPhysio pour vérification" : " dans votre banque"}. En démo,
              rien n&apos;est enregistré.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {step > 0 ? (
            <button type="button" disabled={busy} onClick={() => { setError(null); setStep((s) => s - 1); }} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-ink">
              ← Retour
            </button>
          ) : (
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-ink">
              Annuler
            </button>
          )}
          {step < 2 ? (
            <button type="button" onClick={next} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
              Suivant : {STEP_TITLES[step + 1].toLowerCase()} →
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={demoDone ? onClose : submit} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
              {demoDone ? "Fermer" : busy ? (progress !== null ? `Envoi de la vidéo… ${progress} %` : "Création…") : "Créer l'exercice"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
