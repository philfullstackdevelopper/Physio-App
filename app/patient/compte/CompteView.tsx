import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, CreditCard, Download, LogOut, ShieldCheck, Trash2, User } from "lucide-react";
import SignOutOrExitDemo from "@/components/SignOutOrExitDemo";
import { deleteMyAccount } from "./actions";

// Affichage seul de « Paramètres » du patient (les données viennent de
// page.tsx) — séparé pour pouvoir le prévisualiser avec des données fictives
// sans connexion (/prototypes/patient-ecrans?ecran=compte), audit des formats
// d'écran du 2026-10-10. Les formulaires gardent leurs vraies actions.

export type FollowUpSummary = {
  status: "none" | "pending_card" | "active" | "stopped";
  priceCents: number;
  cardLabel: string | null;
  kineName: string | null;
};

export interface CompteViewProps {
  fullName: string | null;
  error?: string;
  notice?: string | null;
  followUp: FollowUpSummary;
}

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

// Nouveau modèle (2026-10-24) : plus d'abonnement patient — l'appli est
// offerte par le kiné. La carte « Suivi mensuel » résume le suivi payé au
// kiné (bilan mensuel) et mène à /patient/suivi pour le gérer.
function followUpText(f: FollowUpSummary): { title: string; line: string; badge: string; badgeClass: string; cta: string } {
  const kine = f.kineName ?? "votre kiné";
  if (f.status === "active") {
    return { title: "Suivi mensuel actif", line: `${euros(f.priceCents)} € par bilan · ${f.cardLabel ?? "carte enregistrée"}`, badge: "Actif", badgeClass: "bg-ok-soft text-ok", cta: "Gérer mon suivi" };
  }
  if (f.status === "pending_card") {
    return { title: "Suivi mensuel", line: "Carte pas encore enregistrée", badge: "À terminer", badgeClass: "bg-warn-soft text-warn", cta: "Terminer" };
  }
  if (f.status === "stopped") {
    return { title: "Suivi mensuel arrêté", line: `Vous pouvez le reprendre avec ${kine}`, badge: "Arrêté", badgeClass: "bg-app-bg text-muted", cta: "Reprendre" };
  }
  return { title: "Suivi mensuel", line: `Un bilan par mois avec ${kine}, ${euros(f.priceCents)} € (non remboursé)`, badge: "Non activé", badgeClass: "bg-app-bg text-muted", cta: "Découvrir" };
}

export default function CompteView({
  fullName,
  error,
  notice,
  followUp,
}: CompteViewProps) {
  const f = followUpText(followUp);
  return (
    // Téléphone (Philippe, 2026-10-04 : tout sur un écran, plus efficace) :
    // cartes resserrées, textes secondaires masqués. Dès sm : deux cartes.
    <main className="bg-app-bg p-4 pt-5 max-sm:bg-transparent max-sm:pt-2 max-sm:flex max-sm:min-h-[calc(100dvh-var(--phone-chrome))] max-sm:flex-col sm:min-h-dvh sm:p-8 short:sm:py-4">
      <PhoneSettings fullName={fullName} error={error} notice={notice ?? null} f={f} />

      <div className="mx-auto max-w-7xl max-sm:hidden max-sm:flex max-sm:w-full max-sm:flex-1 max-sm:flex-col max-sm:justify-between">
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">Paramètres</h1>
        <p className="mt-1 hidden text-sm text-muted sm:block short:sm:hidden">Gérez votre compte, votre suivi et vos données.</p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        {notice && (
          <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-ok-soft p-3 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {notice}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-5 short:sm:mt-3 short:sm:gap-3 lg:grid-cols-[3fr_2fr]">
          {/* Suivi mensuel (nouveau modèle, 2026-10-24) */}
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6 short:sm:p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-medium text-ink">
                <CreditCard className="h-4 w-4 text-brand" strokeWidth={1.75} />
                {f.title}
              </h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${f.badgeClass}`}>{f.badge}</span>
            </div>
            <p className="mt-3 text-sm text-muted sm:mt-4">{f.line}</p>
            <p className="mt-2 text-sm text-muted">
              Votre programme et l&apos;appli vous sont offerts par votre kiné. Le suivi mensuel est une option : un bilan par
              mois, payé directement à votre kiné, seulement le mois où il est fait.
            </p>
            <Link
              href="/patient/suivi"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              {f.cta}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </section>

          {/* Mon compte */}
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6 short:sm:p-4">
            <h2 className="hidden items-center gap-2 font-medium text-ink sm:flex">
              <User className="h-4 w-4 text-brand" strokeWidth={1.75} />
              Mon compte
            </h2>
            <Link
              href="/patient/compte/informations"
              className="flex items-center justify-between gap-3 border-t border-line py-0 first:border-t-0 first:pt-0 hover:opacity-80 max-sm:border-t-0 sm:mt-4 sm:py-4"
            >
              <div>
                <p className="text-sm font-medium text-ink">Mes informations</p>
                <p className="text-xs text-muted">{fullName ?? "Profil, situation, coordonnées"}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
            </Link>
          </section>
        </div>

        {/* Zone de danger */}
        <section className="mt-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 sm:mt-5 sm:p-6 short:sm:mt-3 short:sm:p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-danger">Zone de danger</h2>
              <p className="mt-1 text-xs text-muted sm:text-sm">
                Supprimer votre compte est définitif : profil, séances et messages seront effacés.
              </p>
              <form action={deleteMyAccount} className="mt-3 flex gap-2 sm:mt-4 sm:flex-row sm:items-center short:sm:mt-2">
                <input
                  type="text"
                  name="confirmation"
                  placeholder="Tapez SUPPRIMER pour confirmer"
                  required
                  className="w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink sm:text-sm focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger-soft sm:max-w-xs"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-danger px-4 py-2 text-sm font-medium text-white hover:brightness-95"
                >
                  <span className="sm:hidden">Supprimer</span>
                  <span className="hidden sm:inline">Supprimer mon compte</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Actions secondaires — pas le même poids que résilier ou supprimer,
            un simple lien suffit (Philippe, 2026-09-11 : "pas forcément vital"). */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted sm:mt-6 sm:gap-x-6 sm:text-sm short:sm:mt-3">
          <Link href="/patient/compte/export" prefetch={false} className="inline-flex items-center gap-1.5 hover:text-ink">
            <Download className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            Télécharger mes données
          </Link>
          <Link href="/confidentialite" className="hover:text-ink hover:underline">
            <span className="sm:hidden">Confidentialité</span>
            <span className="hidden sm:inline">Politique de confidentialité</span>
          </Link>
          <SignOutOrExitDemo className="hover:text-ink" />
        </div>
      </div>
    </main>
  );
}

// Téléphone uniquement (Philippe, 2026-10-06, maquette fournie) : la page en
// liste façon réglages d'appli — carte profil, puis sections étiquetées avec
// des lignes icône + texte + chevron. Exactement les mêmes actions que la
// version ordinateur ci-dessus (rien d'ajouté) ; la suppression du compte se
// déplie depuis sa ligne pour que tout tienne sur un écran.
const ROW = "flex w-full items-center gap-3 px-4 py-3 text-left short:py-2";
const ROW_ICON = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-bg text-ink short:h-8 short:w-8";

function PhoneSettings({
  fullName,
  error,
  notice,
  f,
}: {
  fullName: string | null;
  error?: string;
  notice: string | null;
  f: ReturnType<typeof followUpText>;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 short:gap-2 sm:hidden">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Paramètres</h1>
        <p className="mt-0.5 text-sm text-muted short:hidden">Gérez votre compte, votre suivi et vos données.</p>
      </div>

      {error && <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {notice && (
        <p className="flex items-center gap-1.5 rounded-xl bg-ok-soft p-3 text-sm text-ok">
          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {notice}
        </p>
      )}

      <Link href="/patient/compte/informations" className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-soft short:p-2.5">
        <span className="flex h-11 w-11 shrink-0 short:h-9 short:w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
          <User className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-ink">{fullName ?? "Mes informations"}</span>
          <span className="block truncate text-xs text-muted">Mes informations · profil, situation, coordonnées</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
      </Link>

      <section>
        <h2 className="mb-1.5 px-1 text-sm font-semibold text-ink short:hidden">Suivi mensuel</h2>
        <Link href="/patient/suivi" className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-soft short:p-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <CreditCard className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{f.title}</span>
            <span className="block truncate text-xs text-muted">{f.line}</span>
          </span>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${f.badgeClass}`}>{f.badge}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
        </Link>
      </section>

      <section>
        <h2 className="mb-1.5 px-1 text-sm font-semibold text-ink short:hidden">Mes données</h2>
        <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-soft">
          <Link href="/patient/compte/export" prefetch={false} className={ROW}>
            <span className={ROW_ICON}>
              <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-sm font-medium text-ink">Télécharger mes données</span>
            <ChevronRight className="h-4 w-4 text-muted" strokeWidth={2} />
          </Link>
          <Link href="/confidentialite" className={ROW}>
            <span className={ROW_ICON}>
              <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-sm font-medium text-ink">Politique de confidentialité</span>
            <ChevronRight className="h-4 w-4 text-muted" strokeWidth={2} />
          </Link>
        </div>
      </section>

      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-soft">
        <SignOutOrExitDemo
          className={ROW}
          labelClassName="flex-1 text-sm font-medium text-ink"
          before={
            <span className={ROW_ICON}>
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
          }
          after={<ChevronRight className="h-4 w-4 text-muted" strokeWidth={2} />}
        />
        <details className="group">
          <summary className={`${ROW} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-sm font-medium text-danger">Supprimer mon compte</span>
            <ChevronRight className="h-4 w-4 text-muted transition-transform group-open:rotate-90" strokeWidth={2} />
          </summary>
          <div className="px-4 pb-4">
            <p className="flex items-start gap-1.5 text-xs text-muted">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" strokeWidth={1.75} />
              Définitif : profil, séances et messages seront effacés.
            </p>
            <form action={deleteMyAccount} className="mt-2 flex gap-2">
              <input
                type="text"
                name="confirmation"
                placeholder="Tapez SUPPRIMER"
                required
                className="w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger-soft"
              />
              <button type="submit" className="shrink-0 rounded-full bg-danger px-4 py-2 text-sm font-medium text-white">
                Supprimer
              </button>
            </form>
          </div>
        </details>
      </div>
    </div>
  );
}
