import { redirect } from "next/navigation";
import { UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { isAdminEmail } from "@/lib/admin";
import { getPool } from "@/lib/db/pool";
import { listAllInstructors, listTestAccounts, listWaitlist, type TestAccountRow, type WaitlistRow } from "@/lib/db/admin";
import Waitlist from "./Waitlist";
import TestAccounts from "./TestAccounts";
import KineExercises, { type AdminKineExercise } from "./KineExercises";
import { listKineExercises } from "@/lib/db/admin";
import { resolveMediaUrl } from "@/lib/storage/r2-videos";
import AdminSummary, { sinceLabel, type AdminTodo } from "./AdminSummary";
import { KINE_SUBSCRIPTION_BILLING } from "@/lib/launchFlags";
import { approveInstructor, invoiceLastMonth, rejectInstructor, reactivateInstructor, suspendInstructorAction } from "./actions";
import { KINE_SUBSCRIPTION_TTC_CENTS, eurosFR, periodLabel, periodOf } from "@/lib/billing/reviewModel";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  approved: { label: "Actif", tone: "bg-emerald-50 text-emerald-700" },
  pending: { label: "En attente", tone: "bg-blue-50 text-blue-700" },
  rejected: { label: "Refusé", tone: "bg-slate-100 text-slate-600" },
  suspended: { label: "Suspendu", tone: "bg-red-50 text-red-700" },
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Vérification ICI aussi, pas seulement dans app/admin/layout.tsx (audit du
  // 2026-10-08) : un layout ne se ré-exécute pas à chaque navigation, et
  // cette page lit les coordonnées de tous les kinés via la connexion
  // serveur directe, qui contourne la RLS.
  const user = await requireUser(await createClient());
  if (!isAdminEmail(user.email)) redirect("/");

  const sp = await searchParams;
  const [{ rows }, all] = await Promise.all([
    getPool().query("select * from internal.admin_list_pending_instructors()"),
    listAllInstructors(),
  ]);

  const pending = rows;

  // Comptes de test (migration 0064). Tant qu'elle n'est pas appliquée, la
  // fonction n'existe pas en base : la section l'indique au lieu de faire
  // tomber toute la page /admin.
  // Liste d'attente (migration 0066) : même prudence que les comptes de test.
  let waitlist: WaitlistRow[] | null = null;
  try {
    waitlist = await listWaitlist();
  } catch (e) {
    console.error("[admin] liste d'attente indisponible", e);
  }

  let testAccounts: TestAccountRow[] | null = null;
  try {
    testAccounts = await listTestAccounts();
  } catch (e) {
    console.error("[admin] comptes de test : liste indisponible", e);
  }

  // Exercices créés par les kinés (migration 0081) : même prudence.
  let kineExercises: AdminKineExercise[] | null = null;
  try {
    const rows = await listKineExercises();
    kineExercises = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        name: r.name,
        instructions: r.instructions,
        equipment: r.equipment ?? [],
        videoUrl: await resolveMediaUrl(r.media_url),
        createdAt: new Date(r.created_at).toISOString(),
        status: r.publication_status,
        submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
        reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
        reviewNote: r.review_note,
        forOnePatient: r.for_one_patient,
        filmingConsentAt: r.filming_consent_at ? new Date(r.filming_consent_at).toISOString() : null,
        seenAt: r.admin_seen_at ? new Date(r.admin_seen_at).toISOString() : null,
        sourceName: r.source_name,
        bodyParts: r.body_parts,
        author: [r.author_name, r.author_cabinet].filter(Boolean).join(" · ") || "Kiné",
        authorEmail: r.author_email,
      })),
    );
  } catch (e) {
    console.error("[admin] exercices des kinés : liste indisponible", e);
  }

  // « À traiter » (Philippe, 2026-11-04) : ce qui attend une action.
  const exToReview = (kineExercises ?? []).filter((r) => r.status === "pending");
  const oldestReview = exToReview.map((r) => r.submittedAt).filter(Boolean).sort()[0] ?? null;
  const exToDraw = (kineExercises ?? []).filter((r) => !r.seenAt && r.status !== "declined");
  const approved = all.filter((k) => k.status === "approved");
  const noStripe = approved.filter((k) => k.patient_count > 0 && k.connect_status !== "active");
  const todos: AdminTodo[] = [
    {
      key: "review",
      label: "Exercices à vérifier",
      count: exToReview.length,
      detail: `Proposés à tous par des kinés${oldestReview ? `, le plus ancien ${sinceLabel(oldestReview)}` : ""}. Publier, demander une modification ou garder privé.`,
      href: "#exercices-kines",
      urgent: true,
    },
    {
      key: "draw",
      label: "Démos bleues à dessiner",
      count: exToDraw.length,
      detail: "Nouveaux exercices créés par des kinés, sans dessin animé.",
      href: "#exercices-kines",
    },
    {
      key: "pending",
      label: "Kinés à valider",
      count: pending.length,
      detail: "Inscriptions en attente : vérifier le RPPS, puis approuver ou refuser.",
      href: "#kines-attente",
      urgent: true,
    },
    {
      key: "stripe",
      label: "Paiements non activés",
      count: noStripe.length,
      detail: "Kinés qui ont des patients mais pas encore activé Stripe : leurs patients entrent sans payer.",
      href: "#praticiens",
    },
    {
      key: "waitlist",
      label: "Liste d'attente",
      count: waitlist?.length ?? 0,
      detail: "Personnes à prévenir au lancement (copier les adresses).",
      href: "#liste-attente",
    },
  ];
  const stats = [
    { label: "kinés actifs", value: approved.length },
    { label: "patients", value: all.reduce((n, k) => n + (k.patient_count ?? 0), 0) },
    { label: "patients payants", value: all.reduce((n, k) => n + (k.paying_count ?? 0), 0) },
    { label: "exercices de kinés publiés", value: (kineExercises ?? []).filter((r) => r.status === "published").length },
  ];

  return (
    <div>
      <AdminSummary todos={todos} stats={stats} />
      {/* Bilan de la dernière suspension (app/admin/actions.ts). */}
      {sp.suspended === "1" && (
        <p className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          Kiné suspendu : il n&apos;a plus accès à son espace.
        </p>
      )}
      {sp.error && <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{sp.error}</p>}
      {/* Bilan de la dernière vérification d'exercice (exerciseActions.ts). */}
      {sp.exercice && (
        <p className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          {sp.exercice === "publish"
            ? `Exercice publié : visible par tous les kinés. Son auteur en a maintenant ${sp.publies ?? "?"} de publié(s).`
            : sp.exercice === "changes"
              ? "Modification demandée : le kiné voit votre message dans la fiche de l'exercice."
              : "Exercice gardé privé : il reste dans la banque du kiné, avec votre message."}
          {sp.remise && ` Récompense : EasyPhysio ne prend rien sur les paiements de ses patients jusqu'au ${dateFmt.format(new Date(sp.remise))}.`}
        </p>
      )}
      {/* Bilan de la dernière facturation mensuelle. */}
      {sp.facture && (
        <p className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          Facturation de {periodLabel(sp.facture)} : {sp.factures ?? 0} facture(s) envoyée(s), {sp.offerts ?? 0} premier(s) mois offert(s)
          {Number(sp.deja ?? 0) > 0 ? `, ${sp.deja} déjà facturé(s)` : ""}.
          {Number(sp.sans_moyen ?? 0) > 0 && ` ${sp.sans_moyen} kiné(s) sans moyen de paiement : leur facture reste « à régler » sur leur page Suivi & facturation.`}
          {Number(sp.erreurs ?? 0) > 0 && ` ${sp.erreurs} erreur(s) — voir les journaux, puis relancer.`}
        </p>
      )}

      {/* Abonnement EasyPhysio des kinés (secours de la tâche automatique du 1er).
          Arrêté le 2026-11-02 (KINE_SUBSCRIPTION_BILLING) : masqué tant qu'il ne sert pas. */}
      {KINE_SUBSCRIPTION_BILLING && (
      <form action={invoiceLastMonth} className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Facturer les kinés — {periodLabel(periodOf(new Date()))}</p>
          <p className="text-xs text-slate-500">Abonnement de {eurosFR(KINE_SUBSCRIPTION_TTC_CENTS)} € TTC par mois (ou 3, 6, 12 mois et cabinets), d&apos;avance, prélevé automatiquement. Premier mois offert sur la formule mensuelle. Se fait tout seul le 1er du mois ; un mois n&apos;est jamais facturé deux fois.</p>
        </div>
        <input type="hidden" name="period" value={periodOf(new Date())} />
        <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Lancer la facturation</button>
      </form>
      )}

      {/* Exercices des kinés juste après « À traiter » : c'est la file la plus active. */}
      {kineExercises ? (
        <KineExercises rows={kineExercises} />
      ) : (
        <p className="mb-10 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Exercices des kinés : la base n&apos;est pas encore prête (migration 0081 non appliquée).
        </p>
      )}

      <h2 id="kines-attente" className="mt-12 scroll-mt-6 font-display text-xl font-semibold text-slate-900">
        Comptes praticiens en attente
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {pending.length === 0
          ? "Aucune demande en attente."
          : `${pending.length} demande${pending.length > 1 ? "s" : ""} à traiter.`}
      </p>

      {pending.length > 0 && (
        <ul className="mt-6 space-y-3">
          {pending.map((p) => (
            <li
              key={p.id as string}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">{(p.full_name as string) || "—"}</p>
                <p className="text-sm text-slate-500">{p.email as string}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Inscrit le {dateFmt.format(new Date(p.created_at as string))}
                </p>
                {/* Cabinet details from app/signup/onboarding. Accounts that
                    reach this pending queue failed the automatic RPPS+name
                    check (lib/instructor/rppsVerification.ts) — search this
                    RPPS on annuaire.sante.fr and confirm by hand that it
                    resolves to an active masseur-kinésithérapeute with a
                    matching name before approving. */}
                {p.cabinet_name ? (
                  <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <p className="font-medium text-slate-700">{p.cabinet_name as string}</p>
                    {p.cabinet_address && <p>{p.cabinet_address as string}</p>}
                    {p.phone && <p>Tél. {p.phone as string}</p>}
                    <p className="mt-1">
                      RPPS/ADELI :{" "}
                      <a
                        href="https://annuaire.sante.fr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-700 underline hover:no-underline"
                        title="Vérifier sur l'Annuaire Santé"
                      >
                        {(p.rpps_number as string) || "—"}
                      </a>
                      {p.rpps_verified_at && <span className="ml-1.5 text-emerald-600">✓ vérifié</span>}
                    </p>
                    {p.siret && <p>SIRET {p.siret as string}</p>}
                  </div>
                ) : (
                  <p className="mt-2 text-xs italic text-amber-600">
                    Onboarding cabinet non terminé — informations manquantes.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <form action={approveInstructor}>
                  <input type="hidden" name="id" value={p.id as string} />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <UserCheck className="h-4 w-4" strokeWidth={1.75} />
                    Approuver
                  </button>
                </form>
                {/* Confirmation en deux temps (audit du 2026-10-08) : un clic de
                    travers refusait le compte sans retour possible. */}
                <details className="group relative">
                  <summary className="cursor-pointer list-none rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    Refuser
                  </summary>
                  <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs text-slate-600 shadow-lg">
                    <p>Le praticien ne pourra pas utiliser EasyPhysio. Vous pourrez revenir sur ce refus depuis la liste ci-dessous.</p>
                    <form action={rejectInstructor} className="mt-2">
                      <input type="hidden" name="id" value={p.id as string} />
                      <button type="submit" className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                        Confirmer le refus
                      </button>
                    </form>
                  </div>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Vue d'ensemble de tous les kinés (Philippe, 2026-10-07 : « I need to
          still have overview on the kiné and be able to kick some out »). */}
      <h2 id="praticiens" className="mt-12 scroll-mt-6 font-display text-xl font-semibold text-slate-900">Tous les praticiens</h2>
      <p className="mt-1 text-sm text-slate-500">
        {all.length} compte{all.length > 1 ? "s" : ""}. « RPPS vérifié » = numéro et nom retrouvés dans l&apos;Annuaire Santé (la validation du compte reste manuelle).
      </p>
      <ul className="mt-4 space-y-3">
        {all.map((k) => {
          const st = STATUS_LABEL[k.status] ?? { label: k.status, tone: "bg-slate-100 text-slate-600" };
          return (
            <li key={k.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                    {k.full_name || "—"}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.tone}`}>{st.label}</span>
                    {k.rpps_verified_at && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">RPPS vérifié</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">{k.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {k.cabinet_name ?? "Cabinet non renseigné"} · RPPS {k.rpps_number ?? "—"} · Inscrit le{" "}
                    {dateFmt.format(new Date(k.created_at))}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {k.patient_count} patient{k.patient_count > 1 ? "s" : ""} · Stripe : {k.connect_status === "active" ? "connecté" : k.connect_status ? "inscription en cours" : "non connecté"}
                  </p>
                </div>
                {k.status === "approved" && (
                  // Confirmation en deux temps : le kiné perd l'accès à son espace.
                  <details className="group shrink-0 sm:text-right">
                    <summary className="cursor-pointer list-none rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 [&::-webkit-details-marker]:hidden">
                      Suspendre
                    </summary>
                    <div className="mt-2 max-w-xs rounded-xl bg-red-50 p-3 text-left text-xs text-red-800">
                      <p>
                        Le kiné perd l&apos;accès à son espace. Ses patients gardent leur programme ; plus aucun mois
                        ne peut être facturé, donc plus aucun prélèvement.
                      </p>
                      <form action={suspendInstructorAction} className="mt-2">
                        <input type="hidden" name="id" value={k.id} />
                        <button type="submit" className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                          Confirmer la suspension
                        </button>
                      </form>
                    </div>
                  </details>
                )}
                {/* Refusé : on peut revenir sur sa décision (audit du 2026-10-08 —
                    un refus ne se défaisait qu'en SQL). */}
                {k.status === "rejected" && (
                  <form action={approveInstructor} className="shrink-0">
                    <input type="hidden" name="id" value={k.id} />
                    <button type="submit" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                      Approuver finalement
                    </button>
                  </form>
                )}
                {k.status === "suspended" && (
                  <form action={reactivateInstructor} className="shrink-0">
                    <input type="hidden" name="id" value={k.id} />
                    <button type="submit" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                      Réactiver
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {waitlist ? (
        <Waitlist rows={waitlist} />
      ) : (
        <p className="mt-12 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Liste d&apos;attente : la base n&apos;est pas encore prête (migration 0066 non appliquée).
        </p>
      )}

      {testAccounts ? (
        <TestAccounts accounts={testAccounts} />
      ) : (
        <p className="mt-12 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Comptes de test : la base n&apos;est pas encore prête (migration 0064 non appliquée).
        </p>
      )}
    </div>
  );
}
