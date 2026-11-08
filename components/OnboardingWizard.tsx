"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { stageLabel, type InjuryStage } from "@/lib/exercise/prescription";
import { equipmentLabels as equipmentLabelsFor, type EquipmentId } from "@/lib/exercise/equipment";
import BodyPartIllustration from "@/components/BodyPartIllustration";

// (Philippe, 2026-11-06 : audit, on allège) 3 étapes au lieu de 4 : l'ancienne
// étape « Validation » ne tenait que la case de consentement aux données de
// santé (et restait vide en modification, quand ce consentement est déjà
// donné). La case vit maintenant en bas de l'étape « Équipement », dont le
// bouton final enregistre. Elle reste distincte des CGU, même texte, même
// champ envoyé (health_data_consent), toujours obligatoire.
// Clés de patient.onboarding.steps.
const STEP_LABELS = ["situation", "profile", "equipment"] as const;

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10";
const labelClass = "text-sm font-medium text-slate-700";

export interface OnboardingProfile {
  declared_body_part_ids: string[] | null;
  injury_stage: string | null;
  rehab_progress: string | null;
  history: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
}

export default function OnboardingWizard({
  saveAction,
  bodyParts,
  stages,
  profile,
  equipmentOptions,
  equipmentLabels,
  currentEquipment,
  needsConsent,
  hasError,
  kineBodyPartId = null,
  kineName = null,
}: {
  /** Renvoie { ok: true } une fois enregistré : on ouvre alors l'appli par un
   *  vrai chargement de page (voir app/patient/onboarding/actions.ts). */
  saveAction: (formData: FormData) => Promise<void | { ok: true }>;
  bodyParts: { id: string; slug: string; label: string }[];
  stages: [InjuryStage, string][];
  profile: OnboardingProfile | null;
  equipmentOptions: EquipmentId[];
  equipmentLabels: Record<EquipmentId, string>;
  currentEquipment: Set<EquipmentId>;
  needsConsent: boolean;
  hasError?: boolean;
  /** Zone de la condition attribuée par le kiné (onboarding/page.tsx) : déjà
   *  cochée au premier passage, marquée « Choisi par … ». */
  kineBodyPartId?: string | null;
  kineName?: string | null;
}) {
  const t = useTranslations("patient.onboarding");
  const tSit = useTranslations("patient.situation");
  const tConsent = useTranslations("patient.consent");
  const tStage = useTranslations("exercise.stage");
  const tEquipment = useTranslations("exercise.equipment");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  // Libellés dans la langue de l'interface (en français : ceux reçus de la page,
  // identiques à STAGE_LABELS / EQUIPMENT_LABELS).
  const stageText = (value: InjuryStage, label: string) => (locale === "fr" ? label : stageLabel(value, tStage));
  const equipmentText = locale === "fr" ? equipmentLabels : equipmentLabelsFor(tEquipment);
  // A failed save (server-side validation) reloads the page and resets this
  // component from scratch — landing back on step 0 made the error message
  // above the form invisible-in-spirit: nothing on screen (body-part picker)
  // matched what the error was actually about, which read as "everything's
  // broken" rather than "one field on the last step needs fixing" (Philippe,
  // 2026-09-09). Steps 0-2 are already validated client-side before "Suivant"
  // lets you leave them, so a server-side failure is almost always the
  // consent checkbox on the last step — land there so the error is visible
  // next to what caused it.
  const [step, setStep] = useState(hasError ? STEP_LABELS.length - 1 : 0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Zones déjà enregistrées par le patient ; sinon (premier passage) celle
  // choisie par le kiné, déjà cochée — le patient peut en ajouter ou l'ôter
  // (Philippe, 2026-11-08).
  const kineZone = kineBodyPartId && bodyParts.some((bp) => bp.id === kineBodyPartId) ? kineBodyPartId : null;
  const savedZones = profile?.declared_body_part_ids ?? [];
  const [bodyPartIds, setBodyPartIds] = useState<Set<string>>(
    new Set(savedZones.length > 0 ? savedZones : kineZone ? [kineZone] : []),
  );
  const [bodyPartError, setBodyPartError] = useState(false);
  const toggleBodyPart = (id: string) => {
    setBodyPartError(false);
    setBodyPartIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Each step's fields stay mounted (just visually hidden) across steps, so a
  // plain uncontrolled form — one submit at the very end — keeps every
  // value without lifting it all into React state. "Suivant" only needs to
  // check the fields belonging to the step currently on screen. Body-part
  // checkboxes are the one field kept in React state instead (a "pick at
  // least one" rule has no native HTML equivalent the way `required` does
  // for the others).
  const goNext = () => {
    if (step === 0 && bodyPartIds.size === 0) {
      setBodyPartError(true);
      return;
    }
    const container = stepRefs.current[step];
    if (container) {
      const inputs = container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea");
      for (const el of inputs) {
        if (!el.reportValidity()) return;
      }
    }
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // Hauteur bornée par la page (onboarding/page.tsx) : l'indicateur
  // d'étapes et les boutons Précédent/Suivant restent fixes, seuls les champs
  // défilent si l'écran est trop petit (Philippe, 2026-10-01 : « la partie du
  // haut avec les 4 étapes ne devrait pas bouger »).
  return (
    <div className="flex min-h-0 flex-col">
      {/* Step indicator — no sidebar app-nav here on purpose: onboarding isn't
          done yet, so app/patient/layout.tsx hasn't unlocked the real nav.
          Knowing there are exactly 3 short steps (not an open-ended form) is
          the actual ask — how long this will take. */}
      <ol className="flex shrink-0 items-center justify-center gap-2 sm:gap-3">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  i < step
                    ? "bg-ok text-white"
                    : i === step
                      ? "bg-blue-600 text-white"
                      : "border border-slate-300 bg-white text-slate-400"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
              </span>
              <span className={`hidden text-xs font-medium sm:block ${i === step ? "text-slate-900" : "text-slate-400"}`}>
                {t(`steps.${label}`)}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && <span className={`h-px w-6 sm:w-10 ${i < step ? "bg-ok" : "bg-slate-200"}`} />}
          </li>
        ))}
      </ol>

      <form
        action={async (formData) => {
          const result = await saveAction(formData);
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- chargement complet VOULU : la navigation interne pouvait laisser un écran blanc.
          if (result?.ok) window.location.assign("/patient/appli");
        }}
        className="mt-6 flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 short:mt-3 short:p-5">
        {/* Zone qui défile : les champs de l'étape. -mx-1 px-1 py-1 : de quoi
            ne pas rogner l'anneau de focus des champs. */}
        <div className="-mx-1 min-h-0 overflow-y-auto px-1 py-1">
        {/* Étape 1 : Votre situation */}
        <div ref={(el) => { stepRefs.current[0] = el; }} hidden={step !== 0} className="flex flex-col gap-3">
          <div>
            <span className={labelClass}>{kineZone ? t("bodyPartsQuestionKine") : t("bodyPartsQuestion")}</span>
            {/* 9 body parts in 5 columns -> 2 rows instead of 3 (Philippe,
                2026-09-09: the onboarding card must fit without scrolling —
                paired with the wider max-w-xl column in page.tsx). */}
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {bodyParts.map((bp) => {
                const active = bodyPartIds.has(bp.id);
                return (
                  <button
                    key={bp.id}
                    type="button"
                    onClick={() => toggleBodyPart(bp.id)}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors short:gap-1 short:p-1.5 ${
                      active ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <BodyPartIllustration slug={bp.slug} className="h-10 w-10 short:h-8 short:w-8" active={active} />
                    <span className="text-[11px] font-medium leading-tight text-slate-700">{bp.label}</span>
                    {bp.id === kineZone && (
                      <span className="max-w-full truncate rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                        {kineName ? t("chosenBy", { name: kineName }) : t("chosenByKine")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {[...bodyPartIds].map((id) => (
              <input key={id} type="hidden" name="declared_body_part_ids" value={id} />
            ))}
            {bodyPartError && <p className="mt-1.5 text-xs text-red-600">{t("bodyPartsError")}</p>}
          </div>

          <label>
            <span className={labelClass}>{t("stageQuestion")}</span>
            <select name="injury_stage" required defaultValue={profile?.injury_stage ?? ""} className={fieldClass}>
              <option value="" disabled>
                {t("choose")}
              </option>
              {stages.map(([value, label]) => (
                <option key={value} value={value}>
                  {stageText(value, label)}
                </option>
              ))}
            </select>
          </label>

        </div>

        {/* Étape 2 : Votre profil */}
        <div ref={(el) => { stepRefs.current[1] = el; }} hidden={step !== 1} className="flex flex-col gap-4 short:gap-2.5">
          <label>
            <span className={labelClass}>{t("dob")}</span>
            <input
              type="date"
              name="date_of_birth"
              required
              defaultValue={profile?.date_of_birth ?? ""}
              className={fieldClass}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className={labelClass}>{t("height")}</span>
              <input
                type="number" name="height_cm" min={100} max={230} required
                defaultValue={profile?.height_cm ?? ""}
                className={fieldClass}
              />
            </label>
            <label>
              <span className={labelClass}>{t("weight")}</span>
              <input
                type="number" name="weight_kg" min={20} max={250} required
                defaultValue={profile?.weight_kg ?? ""}
                className={fieldClass}
              />
            </label>
          </div>

          <label>
            <span className={labelClass}>{t("activityQuestion")}</span>
            <select name="activity_level" required defaultValue={profile?.activity_level ?? "moderate"} className={fieldClass}>
              <option value="sedentary">{tSit("activity.sedentary")}</option>
              <option value="moderate">{tSit("activity.moderate")}</option>
              <option value="active">{tSit("activity.active")}</option>
            </select>
          </label>

          {/* Les deux questions facultatives vivent ici plutôt qu'à l'étape 1 :
              l'étape 1 (zones du corps + étape de récupération) doit tenir sur
              un écran sans défiler (Philippe, 2026-10-01). */}
          <label>
            <span className={labelClass}>{t("rehabQuestion")}</span>
            <input
              type="text"
              name="rehab_progress"
              placeholder={t("rehabPlaceholder")}
              defaultValue={profile?.rehab_progress ?? ""}
              className={fieldClass}
            />
          </label>

          <label>
            <span className={labelClass}>{t("historyQuestion")}</span>
            <textarea
              name="history"
              rows={2}
              placeholder={t("historyPlaceholder")}
              defaultValue={profile?.history ?? ""}
              className={`${fieldClass} resize-none`}
            />
          </label>
        </div>

        {/* Étape 3 : Équipement */}
        <div ref={(el) => { stepRefs.current[2] = el; }} hidden={step !== 2} className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">
            {t("equipmentIntro")}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* "aucun" (poids du corps) n'est pas proposé ici : ces exercices
                sont toujours réalisables, qu'il soit coché ou non — pas la
                peine de demander au patient de le cocher (Philippe, 2026-09-09). */}
            {equipmentOptions.filter((id) => id !== "aucun").map((id) => (
              <label
                key={id}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 transition-colors has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/60"
              >
                <input
                  type="checkbox"
                  name="equipment"
                  value={id}
                  defaultChecked={currentEquipment.has(id)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                {equipmentText[id]}
              </label>
            ))}
          </div>

          {/* Consentement aux données de santé (ex-étape 4, voir STEP_LABELS). */}
          {needsConsent && (
            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm text-slate-600">
              <input
                type="checkbox"
                name="health_data_consent"
                required
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span>
                {tConsent.rich("healthData", {
                  link: (c) => (
                    <a href="/confidentialite" className="font-medium text-blue-700 underline" target="_blank">
                      {c}
                    </a>
                  ),
                })}
                {locale !== "fr" && <span className="mt-1 block text-xs text-slate-500">{tCommon("reviewBanner")}</span>}
              </span>
            </label>
          )}
        </div>

        </div>

        {/* Navigation — hors de la zone qui défile : toujours visible. */}
        <div className="mt-5 flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-5 short:mt-3 short:pt-3">
          <button
            type="button"
            onClick={goBack}
            className={`rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 ${step === 0 ? "invisible" : ""}`}
          >
            {t("previous")}
          </button>
          {step < STEP_LABELS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t("next")}
            </button>
          ) : (
            <SubmitButton />
          )}
        </div>
      </form>
    </div>
  );
}

// useFormStatus() only reports the nearest enclosing <form>'s pending state,
// so this has to be its own component rendered *inside* that form — reading
// `pending` directly in OnboardingWizard would always see the parent form,
// not this one. Disabling on first click stops a double "Enregistrer et
// continuer" click from firing two full-page submissions that race each
// other — the second one could land its own redirect after the first
// already succeeded, which looked exactly like "saving bounces you right
// back to step 1" (Philippe, 2026-09-09 — traced via server-side logging,
// the first submission always succeeded; the wizard just let a second one
// go out on top of it).
function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("patient.onboarding");
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? t("saving") : t("saveContinue")}
    </button>
  );
}
