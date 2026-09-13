import { UserCheck } from "lucide-react";
import { getPool } from "@/lib/db/pool";
import { approveInstructor, rejectInstructor } from "./actions";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function AdminPage() {
  const { rows } = await getPool().query("select * from internal.admin_list_pending_instructors()");

  const pending = rows;

  return (
    <div>
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
                <form action={rejectInstructor}>
                  <input type="hidden" name="id" value={p.id as string} />
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Refuser
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
