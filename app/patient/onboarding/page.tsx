import Link from "next/link";
import { AlertCircle, LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import { EQUIPMENT_OPTIONS, EQUIPMENT_LABELS, type EquipmentId } from "@/lib/exercise/equipment";
import { LogoMark } from "@/components/Logo";
import LoginExerciseShowcase from "@/components/LoginExerciseShowcase";
import OnboardingWizard from "@/components/OnboardingWizard";
import { saveOnboarding } from "./actions";

const STAGES = Object.entries(STAGE_LABELS) as [InjuryStage, string][];

// Shown once, right after a patient's first login (gated from /patient — see
// app/patient/layout.tsx). Also reachable later via "Modifier ma situation".
// Redesigned 2026-09-09 (Philippe, working from a reference screenshot): a
// numbered step wizard rather than one long scroll — so a first-time patient
// can see up front that this is 4 short steps, not an open-ended form — with
// the same split layout /login and /invitation use (no dashboard sidebar:
// onboarding isn't done yet, so app/patient/layout.tsx hasn't unlocked it).
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: bodyParts } = await supabase
    .from("body_parts")
    .select("id, slug, label")
    .order("position");

  // Pre-fill if the patient is editing an existing profile.
  const { data: profile } = await supabase
    .from("patient_profiles")
    .select(
      "declared_body_part_ids, injury_stage, rehab_progress, history, date_of_birth, height_cm, weight_kg, activity_level, equipment, health_data_consent_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  // Consent is asked once. Already-consenting patients editing their
  // situation later aren't asked again.
  const needsConsent = !profile?.health_data_consent_at;
  const currentEquipment = new Set((profile?.equipment as EquipmentId[] | null) ?? []);

  return (
    <main className="relative h-screen overflow-hidden bg-[#f6f8fd]">
      {/* Bottom-left, always reachable: the onboarding gate in
          app/patient/layout.tsx has no nav to escape from otherwise, and a
          patient who wants out (wrong account, second thoughts) needs a way
          that isn't "close the tab" (Philippe, 2026-09-09). */}
      <SignOutButton redirectUrl="/login">
        <button
          type="button"
          className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600 lg:bottom-6 lg:left-6"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Se déconnecter
        </button>
      </SignOutButton>

      <div className="relative mx-auto flex h-full max-w-6xl flex-col overflow-y-auto lg:flex-row lg:items-stretch lg:overflow-hidden">
        {/* Left: the wizard itself */}
        <div className="flex flex-1 flex-col justify-center p-4 py-6 sm:p-6 lg:py-8">
          {/* max-w-lg -> max-w-xl -> max-w-2xl (Philippe, 2026-09-09: onboarding
              must fit without scrolling, then flagged as too much empty
              gutter around a small card once it did) — the extra width lets
              the 9 body-part illustrations lay out in 2 rows instead of 3,
              see OnboardingWizard.tsx's grid, and fills more of the left
              half instead of floating in it. Still well inside the lg: split
              layout's left half. */}
          <div className="mx-auto w-full max-w-2xl">
            <Link href="/" className="mb-4 flex items-center justify-center gap-2.5 lg:hidden">
              <LogoMark size={32} />
              <span className="font-display text-lg font-semibold text-slate-900">EasyPhysio</span>
            </Link>

            <div className="text-center">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Votre situation
              </h1>
            </div>

            {error && (
              <p className="mt-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                {error}
              </p>
            )}

            <div className="mt-4">
              <OnboardingWizard
                saveAction={saveOnboarding}
                bodyParts={bodyParts ?? []}
                stages={STAGES}
                profile={profile}
                equipmentOptions={EQUIPMENT_OPTIONS}
                equipmentLabels={EQUIPMENT_LABELS}
                currentEquipment={currentEquipment}
                hasError={!!error}
                needsConsent={needsConsent}
              />
            </div>
          </div>
        </div>

        {/* Right: same sticky exercise showcase as /login and /invitation —
            gives the "why" while the wizard gives the "how long" (Philippe,
            2026-09-09). */}
        <div className="hidden flex-1 flex-col px-16 py-10 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={36} />
            <span className="font-display text-xl font-semibold text-slate-900">EasyPhysio</span>
          </Link>
          <div className="mt-8 min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
