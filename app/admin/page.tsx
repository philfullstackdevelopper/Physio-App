import { redirect } from "next/navigation";
import { UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { isAdminEmail } from "@/lib/admin";
import { getPool } from "@/lib/db/pool";
import { listAllInstructors, listTestAccounts, type TestAccountRow } from "@/lib/db/admin";
import TestAccounts from "./TestAccounts";
import { approveInstructor, rejectInstructor, reactivateInstructor, suspendInstructorAction } from "./actions";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  approved: { label: "Actif", tone: "bg-emerald-50 text-emerald-700" },
  pending: { label: "En attente", tone: "bg-blue-50 text-blue-700" },
  rejected: { label: "Refusé", tone: "bg-slate-100 text-slate-600" },
  suspended: { label: "Suspendu", tone: "bg-red-50 text-red-700" },
};
const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

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
  let testAccounts: TestAccountRow[] | null = null;
  try {
    testAccounts = await listTestAccounts();
  } catch (e) {
    console.error("[admin] comptes de test : liste indisponible", e);
  }

  return (
    <div>
      {/* Bilan de la dernière suspension (app/admin/actions.ts). */}
      {sp.suspended === "1" && (
        <p className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          Kiné suspendu. {sp.cancelled ?? 0} abonnement(s) résilié(s), {sp.refunds ?? 0} remboursement(s) pour{" "}
          {euros(Number(sp.cents ?? 0))}.
          {Number(sp.failures ?? 0) > 0 &&
            ` ${sp.failures} abonnement(s) n'ont pas pu être traités — relancez « Suspendre » pour réessayer.`}
        </p>
      )}
      {sp.error && <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{sp.error}</p>}

      <h1 className="font-display text-2xl font-semibold text-slate-900">
        Comptes praticiens en attente
      </h1>
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
      <h2 className="mt-12 font-display text-xl font-semibold text-slate-900">Tous les praticiens</h2>
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
                    {k.patient_count} patient{k.patient_count > 1 ? "s" : ""}, dont {k.paying_count} abonné
                    {k.paying_count > 1 ? "s" : ""} · Stripe : {k.connect_status === "active" ? "connecté" : k.connect_status ? "inscription en cours" : "non connecté"}
                  </p>
                </div>
                {k.status === "approved" && (
                  // Confirmation en deux temps : l'action résilie et rembourse
                  // les abonnements de tous ses patients.
                  <details className="group shrink-0 sm:text-right">
                    <summary className="cursor-pointer list-none rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 [&::-webkit-details-marker]:hidden">
                      Suspendre
                    </summary>
                    <div className="mt-2 max-w-xs rounded-xl bg-red-50 p-3 text-left text-xs text-red-800">
                      <p>
                        Le kiné perd l&apos;accès à son espace. Les abonnements de ses {k.paying_count} patient(s) abonné(s)
                        sont résiliés tout de suite et la part non utilisée du mois leur est remboursée. Ses patients
                        gardent l&apos;accès gratuit à leur programme.
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
