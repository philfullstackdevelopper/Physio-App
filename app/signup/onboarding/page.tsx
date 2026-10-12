import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import DotCanvas from "@/components/DotCanvas";
import { saveInstructorOnboarding } from "./actions";

// Cabinet/practice details, asked once right after Clerk signup (see
// app/signup/finalize/page.tsx) and before the "en attente" screen — gives
// the admin approval screen (app/admin/page.tsx) enough to manually verify a
// new kiné, and puts the RPPS number on file for the automatic Annuaire
// Santé check once ESANTE_API_KEY exists (lib/instructor/rppsVerification.ts).
//
// A plain self-read (instructors_select_own already covers it) — by the time
// this page renders, app/signup/finalize/page.tsx has already created the
// row this reads.
export default async function SignupOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: instructor } = await supabase
    .from("instructors")
    .select("status, cabinet_name, cabinet_address, phone, rpps_number, siret")
    .eq("id", user.id)
    .maybeSingle();

  if (!instructor) redirect("/signup/kine");
  // Already completed — don't let a bookmarked/back-navigated link re-open
  // this step (also whichever screen is next: approved goes straight in).
  if (instructor.cabinet_name) {
    redirect(instructor.status === "approved" ? "/dashboard" : "/signup/pending");
  }

  return (
    // Écran peu haut : même resserrement que le formulaire d'inscription
    // (components/KineSignupFlow.tsx, mêmes champs) pour tenir sans défiler.
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-[#f6f8fd] p-4 py-16 short:py-3">
      <DotCanvas />

      <div className="relative mx-auto w-full max-w-lg">
        <div className="rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-sm backdrop-blur max-sm:p-5 short:p-5">
          <h1 className="font-display text-2xl font-semibold text-slate-900"><span className="text-blue-700">EasyPhysio ·</span>{" "}Votre cabinet</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 short:hidden">
            Quelques informations professionnelles avant l&apos;activation de votre compte —
            elles nous permettent de vérifier votre inscription.
          </p>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <form action={saveInstructorOnboarding} className="mt-6 flex flex-col gap-4 short:mt-3 short:gap-2.5">
            <label>
              <span className="text-sm font-medium text-slate-700">Nom du cabinet</span>
              <input
                type="text"
                name="cabinet_name"
                required
                defaultValue={instructor.cabinet_name ?? ""}
                placeholder="ex. Cabinet de kinésithérapie du Parc"
                className={fieldClass}
              />
            </label>

            <label>
              <span className="text-sm font-medium text-slate-700">Adresse du cabinet</span>
              <input
                type="text"
                name="cabinet_address"
                required
                defaultValue={instructor.cabinet_address ?? ""}
                placeholder="12 rue des Lilas, 75011 Paris"
                className={fieldClass}
              />
            </label>

            <label>
              <span className="text-sm font-medium text-slate-700">Téléphone professionnel</span>
              <input
                type="tel"
                name="phone"
                required
                defaultValue={instructor.phone ?? ""}
                placeholder="06 12 34 56 78"
                className={fieldClass}
              />
            </label>

            <div className="flex flex-col gap-4 short:grid short:grid-cols-2 short:gap-3">
            <label>
              <span className="text-sm font-medium text-slate-700">Numéro RPPS ou ADELI</span>
              <input
                type="text"
                name="rpps_number"
                required
                inputMode="numeric"
                defaultValue={instructor.rpps_number ?? ""}
                placeholder="11 chiffres"
                className={fieldClass}
              />
              <span className="mt-1 block text-xs text-slate-400">
                <span className="short:hidden">Votre identifiant professionnel — voir{" "}</span>
                <a
                  href="https://www.ordremk.fr/je-suis-kinesitherapeute/exercice/minscrire-a-lordre/mon-identifiant-rpps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block underline hover:text-slate-600 short:first-letter:uppercase"
                >
                  où le trouver
                </a>
                <span className="short:hidden">.</span>
              </span>
            </label>

            <label>
              <span className="text-sm font-medium text-slate-700">
                SIRET <span className="font-normal text-slate-400">(optionnel)</span>
              </span>
              <input
                type="text"
                name="siret"
                inputMode="numeric"
                defaultValue={instructor.siret ?? ""}
                placeholder="14 chiffres"
                className={fieldClass}
              />
            </label>
            </div>

            <button
              type="submit"
              className="mt-2 rounded-xl bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 short:mt-1"
            >
              Continuer
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm short:mt-1 short:py-2 transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10";
