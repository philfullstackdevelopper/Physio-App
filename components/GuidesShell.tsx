import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import WaitlistForm from "@/components/WaitlistForm";
import { SIGNUPS_OPEN } from "@/lib/launchFlags";

// Cadre des pages /guides : même fond que l'accueil (halo bleu + grain),
// même en-tête et même pied de page, pour que les guides fassent partie du site.
export default function GuidesShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f6f8fd] text-slate-800">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(1200px 800px at 85% -8%, rgba(37, 99, 235, 0.12) 0%, transparent 55%), radial-gradient(900px 650px at 4% 18%, rgba(37, 99, 235, 0.07) 0%, transparent 60%)",
        }}
      />
      <div aria-hidden className="grain pointer-events-none absolute inset-0 -z-10" />
      <div className="relative z-10">
        <SiteHeader />
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}

/**
 * Bloc final sombre, identique à celui du bas de l'accueil (#liste-attente) :
 * pour un kiné, liste d'attente avant le lancement ou création de compte après ;
 * pour un patient, accès à son espace.
 */
export async function GuideCta({ audience }: { audience: "kine" | "patient" }) {
  const t = await getTranslations("home.landing");
  const tg = await getTranslations("home.guides");
  const patient = audience === "patient";
  const title = patient ? tg("patientCtaTitle") : SIGNUPS_OPEN ? t("finalTitleOpen") : t("finalTitleWaitlist");
  const body = patient ? tg("patientCtaBody") : SIGNUPS_OPEN ? t("finalBodyOpen") : t("finalBodyWaitlist");
  return (
    <div className="rounded-[2rem] bg-slate-900 px-8 py-12 text-center shadow-xl max-sm:px-5 max-sm:py-10 sm:px-14">
      <h2 className="font-display mx-auto max-w-xl text-2xl font-semibold leading-tight text-white sm:text-3xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-md leading-relaxed text-slate-300">{body}</p>
      {patient || SIGNUPS_OPEN ? (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={patient ? "/login" : "/signup/kine"}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-6 py-3 font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 active:scale-95"
          >
            {patient ? t("signIn") : t("createKineAccount")}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      ) : (
        <div className="mx-auto mt-8 max-w-md">
          <WaitlistForm />
          <p className="mt-5 text-sm text-slate-400">
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-medium text-white underline-offset-4 hover:underline">
              {t("signIn")}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
