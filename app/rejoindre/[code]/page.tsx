import Link from "next/link";
import { getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import LoginExerciseShowcase from "@/components/LoginExerciseShowcase";
import { joinLinkKine } from "@/lib/db/admin";
import { instructorIdFromJoinCode } from "@/lib/patient/joinLink";
import { canInvitePatients } from "@/lib/launch";
import { joinViaLink } from "./actions";

// Page ouverte en scannant le QR code d'un kiné, ou par son lien (Philippe,
// 2026-11-04 : « hella clean », et le patient doit voir clairement QUI va le
// suivre). Même mise en page que /invitation et /login : à gauche le
// formulaire, à droite la vitrine d'exercices (ordinateur seulement).
export async function generateMetadata() {
  const t = await getTranslations("auth.join");
  return { title: t("metaTitle"), robots: { index: false } };
}
export const dynamic = "force-dynamic";

const field =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10";

function initials(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "K") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Qui va suivre le patient : visible d'un coup d'œil. */
async function KineCard({ name }: { name: string | null }) {
  const t = await getTranslations("auth.join");
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
        {initials(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{name ?? t("yourPhysioLong")}</p>
        <p className="text-xs text-slate-500">{t("kineRole")}</p>
      </div>
    </div>
  );
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string; ok?: string; email?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const instructorId = instructorIdFromJoinCode(code);
  const kine = instructorId ? await joinLinkKine(instructorId).catch(() => null) : null;
  const available = !!kine && kine.status === "approved";
  const open = available && canInvitePatients(kine!.email);
  const kineName = kine?.full_name ?? null;
  const t = await getTranslations("auth.join");
  const tShared = await getTranslations("auth.shared");
  const STEPS = [t("stepEmail"), t("stepPassword"), t("stepProgramme")];

  return (
    <main className="relative min-h-dvh bg-[#f6f8fd]">
      {/* Choix de la langue, discret en haut à droite. */}
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

            {!available ? (
              <div className="mt-10">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">{t("invalidTitle")}</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {t("invalidBody")}
                </p>
              </div>
            ) : sp.ok ? (
              <div className="mt-8">
                <KineCard name={kineName} />
                <span className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <MailCheck className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-slate-900">{t("checkEmailTitle")}</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {t.rich("checkEmailBody", {
                    email: sp.email ?? t("yourAddress"),
                    kine: kineName ?? t("yourPhysio"),
                    b: (c) => <span className="font-medium text-slate-700">{c}</span>,
                  })}
                </p>
                <p className="mt-4 text-xs text-slate-400">{t("nothingReceived")}</p>
              </div>
            ) : (
              <div className="mt-8">
                <KineCard name={kineName} />
                <h1 className="font-display mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {t("title")}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {t("subtitle")}
                </p>

                {/* Les trois étapes, pour savoir où l'on va. */}
                <ol className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                  {STEPS.map((s, i) => (
                    <li key={s} className="flex items-center gap-2 whitespace-nowrap">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${i === 0 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                        {i + 1}
                      </span>
                      <span className={i === 0 ? "text-slate-900" : ""}>{s}</span>
                      {i < STEPS.length - 1 && <span className="h-px w-3 bg-slate-300" />}
                    </li>
                  ))}
                </ol>

                {!open && (
                  <p className="mt-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3.5 text-sm text-slate-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" strokeWidth={1.75} />
                    {t("notOpen")}
                  </p>
                )}
                {sp.error && (
                  <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {sp.error}
                  </p>
                )}

                <form action={joinViaLink.bind(null, code)} className="mt-5">
                  <fieldset disabled={!open} className="space-y-3.5 disabled:opacity-50">
                    <label className="block text-sm font-medium text-slate-700">
                      {t("fullName")}
                      <input name="full_name" type="text" required autoComplete="name" className={field} />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      {t("email")}
                      <input name="email" type="email" required autoComplete="email" inputMode="email" className={field} />
                    </label>
                    <SubmitButton
                      pendingText={t("sending")}
                      className="!mt-5 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
                    >
                      {t("submit")}
                    </SubmitButton>
                  </fieldset>
                </form>
                <p className="mt-4 text-center text-sm text-slate-500">
                  {tShared("haveAccount")}{" "}
                  <Link href="/login" className="font-medium text-blue-700 hover:underline">
                    {tShared("signIn")}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="hidden flex-1 flex-col px-16 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div className="min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
