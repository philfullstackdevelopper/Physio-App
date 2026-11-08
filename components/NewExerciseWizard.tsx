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
import { useTranslations } from "next-intl";
import { X, Plus, Trash2, Camera, Upload, Globe, User, BookOpen, Check } from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import { EXERCISE_EQUIPMENT_OPTIONS, exerciseEquipmentLabels } from "@/lib/exercise/equipment";
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
  const t = useTranslations("exercise.wizard");
  const tVideo = useTranslations("exercise.kineVideo");
  const tContributor = useTranslations("exercise.contributor");
  const equipmentLabels = exerciseEquipmentLabels(useTranslations("exercise.exerciseEquipment"));
  const STEP_TITLES = [t("stepMovement"), t("stepVideo"), t("stepWho")];
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
  // Décoché par défaut (audit du 2026-11-08) : partager avec tous les kinés est un choix.
  const [makePublic, setMakePublic] = useState(false);
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
    setName(t("variantName", { name: ex.name }));
    setBodyPartIds(ex.bodyPartIds.length ? ex.bodyPartIds : bodyPartIds);
    setEquipment(ex.equipment);
    const s = parseSteps(ex.instructions);
    setSteps(s.length ? s : ["", ""]);
  };

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const chooseVideo = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    const problem = checkVideoFile(f, tVideo);
    if (problem) {
      setError(problem);
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(f);
    setVideoPreview(URL.createObjectURL(f));
  };

  const step1Problem =
    name.trim().length < 3 ? t("needName") : bodyPartIds.length === 0 ? t("needBodyPart") : null;
  const step2Problem = video && !consent ? t("needConsent") : null;
  const step3Problem = scope === "patient" && !patientId ? t("needPatient") : null;

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
          await uploadKineVideo(res.id, video, consent, setProgress, tVideo);
        } catch (e) {
          // L'exercice existe déjà : on le dit, la vidéo pourra être renvoyée
          // depuis sa fiche.
          router.refresh();
          setError(t("createdVideoFailed", { detail: e instanceof Error ? e.message : t("error") }));
          setBusy(false);
          setProgress(null);
          return;
        }
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("createFailed"));
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
            {t("title")}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="rounded-full p-1.5 text-muted hover:bg-app-bg hover:text-ink">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <ol className="flex gap-1.5 px-5 pt-3">
          {STEP_TITLES.map((title, i) => (
            <li
              key={title}
              className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs ${
                i === step ? "border-brand bg-brand-soft font-semibold text-brand" : i < step ? "border-line text-ink" : "border-line text-muted"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {i < step && <Check className="h-3 w-3" strokeWidth={3} />}
                {i + 1}. {title}
              </span>
            </li>
          ))}
        </ol>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">{t("nameLabel")}</span>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setDupDismissed(false);
                  }}
                  placeholder={t("namePlaceholder")}
                  className={field}
                  autoFocus
                />
              </label>

              {source && (
                <p className="rounded-lg bg-ok-soft p-2.5 text-sm text-ink">
                  {t.rich(source.hasVideo ? "startingFromVideo" : "startingFrom", { name: source.name, b: (c) => <b>{c}</b> })}{" "}
                  <button type="button" onClick={() => setSource(null)} className="font-medium text-brand hover:underline">
                    {t("dontStartFrom")}
                  </button>
                </p>
              )}

              {similar.length > 0 && (
                <div className="rounded-xl border border-warn/40 bg-warn-soft p-3">
                  <p className="text-sm font-semibold text-ink">{t("maybeExists")}</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {similar.map((ex) => (
                      <li key={ex.id} className="flex items-center gap-3 rounded-lg bg-surface p-2">
                        <ExerciseIllustration name={ex.name} className="h-12 w-14 shrink-0 text-brand" />
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="block font-medium text-ink">{ex.name}</span>
                          <span className="text-xs text-muted">{ex.hasVideo ? t("withVideo") : t("drawingOnly")}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => startFrom(ex)}
                          className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-app-bg"
                        >
                          {t("startFrom")}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => setDupDismissed(true)} className="mt-2 text-xs font-medium text-brand hover:underline">
                    {t("isNew")}
                  </button>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted">{t("bodyParts")}</p>
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
                <p className="text-xs font-semibold text-muted">{t("equipment")}</p>
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
                        {equipmentLabels[id]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted">{t("stepsLabel")}</p>
                <p className="mt-0.5 text-xs text-muted">{t("stepsHint")}</p>
                <ol className="mt-2 flex flex-col gap-2">
                  {steps.map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">{i + 1}</span>
                      <input
                        value={s}
                        onChange={(e) => setSteps((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                        placeholder={i === 0 ? t("firstStepPlaceholder") : t("nextStepPlaceholder")}
                        className={field}
                      />
                      {steps.length > 1 && (
                        <button
                          type="button"
                          aria-label={t("removeStep", { n: i + 1 })}
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
                    <Plus className="h-4 w-4" strokeWidth={2} /> {t("addStep")}
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
                      <b>{video?.name}</b> {t("sizeMb", { size: Math.max(1, Math.round((video?.size ?? 0) / 1024 / 1024)) })}
                    </p>
                    <p className="text-xs text-muted">
                      {t("videoHint")}
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
                      {t("removeVideo")}
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
                    <Camera className="h-4 w-4" strokeWidth={2} /> {t("filmNow")}
                  </button>
                  <button
                    type="button"
                    onClick={() => pickRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-app-bg"
                  >
                    <Upload className="h-4 w-4" strokeWidth={2} /> {t("chooseVideo")}
                  </button>
                  <input ref={cameraRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => chooseVideo(e.target.files?.[0])} />
                  <input ref={pickRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => chooseVideo(e.target.files?.[0])} />
                </div>
              )}
              {video && (
                <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm text-ink">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-brand" />
                  <span>{t.rich(makePublic && scope === "bank" ? "consentPublic" : "consent", { b: (c) => <b>{c}</b> })}</span>
                </label>
              )}
              {!video && (
                <p className="text-sm text-muted">
                  {source?.hasVideo ? t("noVideoSource") : t("noVideo")}
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
                  <span className="block font-semibold text-ink">{t("bankTitle")}</span>
                  <span className="text-sm text-muted">{t("bankText")}</span>
                </span>
              </button>
              <div className={`rounded-xl border p-3 ${scope === "patient" ? "border-brand bg-brand-soft" : "border-line"}`}>
                <button type="button" onClick={() => setScope("patient")} aria-pressed={scope === "patient"} className="flex w-full items-start gap-3 text-left">
                  <User className={`mt-0.5 h-5 w-5 shrink-0 ${scope === "patient" ? "text-brand" : "text-muted"}`} strokeWidth={2} />
                  <span>
                    <span className="block font-semibold text-ink">{t("patientTitle")}</span>
                    <span className="text-sm text-muted">{t("patientText")}</span>
                  </span>
                </button>
                {scope === "patient" && (
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className={`${field} mt-3`}
                    aria-label={t("patientAria")}
                  >
                    <option value="">{t("choosePatient")}</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
                {scope === "patient" && patients.length === 0 && <p className="mt-2 text-sm text-muted">{t("noPatients")}</p>}
              </div>

              {scope === "bank" && (
                <label className="flex items-start gap-3 rounded-xl border-[1.5px] border-ok bg-ok-soft p-3">
                  <input type="checkbox" checked={makePublic} onChange={(e) => setMakePublic(e.target.checked)} className="mt-1 h-4 w-4 accent-ok" />
                  <span className="text-sm text-ink">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Globe className="h-4 w-4 text-ok" strokeWidth={2} /> {t("makePublic")}
                    </span>
                    <span className="mt-0.5 block">
                      {t("makePublicText")}
                    </span>
                    <span className="mt-1.5 block text-xs text-muted">
                      {contributorTitle(publishedCount, tContributor)
                        ? t("youAre", { title: contributorTitle(publishedCount, tContributor) ?? "", count: publishedCount })
                        : t("publishedSoFar", { count: publishedCount, next: nextContributorStep(publishedCount, tContributor) ?? "" })}
                    </span>
                  </span>
                </label>
              )}
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          {demoDone && (
            <p className="mt-4 rounded-lg bg-ok-soft p-3 text-sm text-ink">
              {scope === "patient" ? t("demoDonePatient") : makePublic ? t("demoDonePublic") : t("demoDoneBank")}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {step > 0 ? (
            <button type="button" disabled={busy} onClick={() => { setError(null); setStep((s) => s - 1); }} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-ink">
              {t("back")}
            </button>
          ) : (
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-ink">
              {t("cancel")}
            </button>
          )}
          {step < 2 ? (
            <button type="button" onClick={next} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
              {t("next", { step: STEP_TITLES[step + 1].toLowerCase() })}
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={demoDone ? onClose : submit} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
              {demoDone ? t("close") : busy ? (progress !== null ? t("uploadingVideo", { progress }) : t("creating")) : t("create")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
