import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { AlertCircle, ArrowLeft, Building2 } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SubmitButton from "@/components/SubmitButton";
import LoginExerciseShowcase from "@/components/LoginExerciseShowcase";
import { cabinetByInvite } from "@/lib/db/cabinets";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import { joinCabinetFromInvite } from "./actions";

// Page technique : rien à référencer dans les moteurs de recherche.
export async function generateMetadata() {
  const t = await getTranslations("auth.cabinetInvite");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

// Lien d'invitation d'un cabinet (Philippe, 2026-11-16, migration 0091) : un
// kiné du cabinet l'envoie à ses collègues. Trois cas :
//  - pas connecté   → « Créer mon compte » (le cabinet est déjà choisi) ou
//                     « J'ai déjà un compte » (connexion puis retour ici) ;
//  - kiné connecté  → « Rejoindre le cabinet », directement, sans demande ;
//  - autre compte   → ce lien est réservé aux kinés.
// La page ne montre que le nom, la ville et le nombre de kinés du cabinet.
export default async function CabinetInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { code } = await params;
  const { error } = await searchParams;
  const t = await getTranslations("auth.cabinetInvite");
  const cabinet = await cabinetByInvite(code).catch(() => null);

  // Qui regarde ? (sans session : personne ; avec : kiné ou non)
  const { userId } = await auth();
  // Audit du 2026-11-16 (C5) : un kiné pas encore validé (inscription à
  // terminer) ou suspendu n'est pas « un autre compte » — on lui dit quoi faire.
  let viewer: "anonymous" | "kine" | "kine-pending" | "kine-blocked" | "other" = "anonymous";
  if (userId && cabinet) {
    const supabase = await createClient();
    const me = await requireUser(supabase);
    const { data: kine } = await supabase.from("instructors").select("status").eq("id", me.id).maybeSingle();
    const status = (kine?.status as string | null) ?? null;
    viewer = !kine ? "other" : status === "approved" ? "kine" : status === "pending" ? "kine-pending" : "kine-blocked";
  }
  const here = `/cabinet/${encodeURIComponent(code)}`;
  const join = joinCabinetFromInvite.bind(null, code);

  return (
    <main className="relative min-h-dvh bg-[#f6f8fd]">
      <div className="absolute right-4 top-4 z-10 lg:right-6 lg:top-6">
        <LanguageSwitcher />
      </div>
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col lg:flex-row lg:items-stretch">
        <div className="flex flex-1 justify-center px-5 pb-10 pt-6 sm:items-center sm:p-16">
          <div className="w-full max-w-sm">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              <span className="font-display font-semibold">
                <span className="text-slate-900">Easy</span>
                <span className="text-blue-700">Physio</span>
              </span>
            </Link>

            {!cabinet ? (
              <div className="mt-10">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">{t("invalidTitle")}</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{t("invalidBody")}</p>
                <Link href="/signup/kine" className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                  {t("signupAnyway")}
                </Link>
              </div>
            ) : (
              <div className="mt-8">
                <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <Building2 className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{cabinet.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {[cabinet.city, t("kineCount", { count: cabinet.members })].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </div>
                <h1 className="font-display mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {t("title", { name: cabinet.name })}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{t("subtitle")}</p>

                {error && (
                  <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {error}
                  </p>
                )}

                {viewer === "kine" ? (
                  <form action={join} className="mt-6">
                    <SubmitButton className="w-full rounded-xl bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">
                      {t("joinNow")}
                    </SubmitButton>
                  </form>
                ) : viewer === "kine-pending" ? (
                  <div className="mt-6 rounded-xl bg-blue-50 px-4 py-3 text-sm text-slate-700">
                    <p>{t("finishFirst")}</p>
                    <Link href="/signup/onboarding" className="mt-2 inline-flex rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700">
                      {t("finishButton")}
                    </Link>
                  </div>
                ) : viewer === "kine-blocked" ? (
                  <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{t("blocked")}</p>
                ) : viewer === "other" ? (
                  <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{t("kinesOnly")}</p>
                ) : (
                  <div className="mt-6 flex flex-col gap-3">
                    <Link
                      href={`/signup/kine?invitation=${encodeURIComponent(code)}`}
                      className="rounded-xl bg-blue-600 py-2.5 text-center font-medium text-white transition hover:bg-blue-700"
                    >
                      {t("createAccount")}
                    </Link>
                    <Link
                      href={`/login?redirect_url=${encodeURIComponent(here)}`}
                      className="rounded-xl border border-slate-200 bg-white py-2.5 text-center font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {t("haveAccount")}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="hidden flex-1 flex-col px-16 py-6 lg:sticky lg:top-0 lg:flex lg:h-dvh">
          <div className="min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
