"use client";

import { useActionState } from "react";
import { FlaskConical, Trash2 } from "lucide-react";
import type { TestAccountRow } from "@/lib/db/admin";
import {
  createTestKine,
  createTestPatientAction,
  deleteTestAccountAction,
  type TestAccountResult,
} from "./testAccountActions";

// Comptes de test (Philippe, 2026-10-10) — voir app/admin/testAccountActions.ts.
// L'e-mail et le mot de passe ne sont affichés qu'UNE fois, juste après la
// création (le mot de passe n'est enregistré nulle part en clair) : perdu, on
// supprime le compte et on en recrée un.

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none";
const button =
  "rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";

function Credentials({ result }: { result: TestAccountResult }) {
  if (!result) return null;
  if (!result.ok) return <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{result.error}</p>;
  return (
    <div className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="font-medium">
        {result.kind === "kine" ? "Kiné" : "Patient"} de test créé : {result.fullName}
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-emerald-700">E-mail</dt>
        <dd className="select-all break-all font-mono">{result.email}</dd>
        <dt className="text-emerald-700">Mot de passe</dt>
        <dd className="select-all break-all font-mono">{result.password}</dd>
      </dl>
      <p className="mt-2 text-xs text-emerald-800">
        Notez-les maintenant : le mot de passe ne sera plus affiché. Si un code de vérification est demandé à la
        connexion, c&apos;est 424242.
      </p>
    </div>
  );
}

export default function TestAccounts({ accounts }: { accounts: TestAccountRow[] }) {
  const [kineResult, kineAction, kinePending] = useActionState(createTestKine, null);
  const [patientResult, patientAction, patientPending] = useActionState(createTestPatientAction, null);
  const kines = accounts.filter((a) => a.kind === "kine");

  return (
    <section id="comptes-de-test" className="mt-12 scroll-mt-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-slate-900">
        <FlaskConical className="h-5 w-5 text-blue-600" strokeWidth={1.75} />
        Comptes de test
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        De faux comptes pour essayer l&apos;application. Aucun e-mail n&apos;est envoyé : vous vous connectez avec
        l&apos;e-mail et le mot de passe affichés à la création.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <form action={kineAction} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-medium text-slate-900">Créer un kiné de test</p>
          <p className="mt-0.5 text-xs text-slate-500">Compte déjà validé, sans numéro RPPS.</p>
          <input name="full_name" required maxLength={60} placeholder="Nom (ex. Marie Test)" className={`mt-3 ${input}`} />
          <button type="submit" disabled={kinePending} className={`mt-3 ${button}`}>
            {kinePending ? "Création…" : "Créer le kiné"}
          </button>
        </form>

        <form action={patientAction} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-medium text-slate-900">Créer un patient de test</p>
          <p className="mt-0.5 text-xs text-slate-500">Rattaché à un kiné de test uniquement.</p>
          {kines.length === 0 ? (
            <p className="mt-3 text-sm italic text-slate-500">Créez d&apos;abord un kiné de test.</p>
          ) : (
            <>
              <input name="full_name" required maxLength={60} placeholder="Nom (ex. Paul Test)" className={`mt-3 ${input}`} />
              <select name="instructor_id" required className={`mt-2 ${input}`} defaultValue={kines[0].app_id}>
                {kines.map((k) => (
                  <option key={k.app_id} value={k.app_id}>
                    Kiné : {k.full_name}
                  </option>
                ))}
              </select>
              <label className="mt-2 flex items-start gap-2 text-xs text-slate-600">
                <input type="checkbox" name="free_access" defaultChecked className="mt-0.5" />
                <span>
                  Accès offert, sans passer par le paiement. Décochez pour tester le choix d&apos;une offre (le kiné
                  de test doit alors avoir connecté Stripe).
                </span>
              </label>
              <button type="submit" disabled={patientPending} className={`mt-3 ${button}`}>
                {patientPending ? "Création…" : "Créer le patient"}
              </button>
            </>
          )}
        </form>
      </div>

      <Credentials result={kineResult} />
      <Credentials result={patientResult} />

      {accounts.length > 0 && (
        <ul className="mt-4 space-y-2">
          {accounts.map((a) => (
            <li
              key={a.app_id}
              className={`flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm ${
                a.kind === "patient" ? "ml-6" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                  {a.full_name}
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Test · {a.kind === "kine" ? "kiné" : "patient"}
                  </span>
                </p>
                <p className="select-all break-all font-mono text-xs text-slate-500">{a.email}</p>
                <p className="text-xs text-slate-400">
                  {a.kind === "patient" && a.instructor_name ? `Patient de ${a.instructor_name} · ` : ""}
                  Créé le {dateFmt.format(new Date(a.created_at))}
                </p>
              </div>
              <details className="relative shrink-0">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 [&::-webkit-details-marker]:hidden">
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  Supprimer
                </summary>
                <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs text-slate-600 shadow-lg">
                  <p>
                    {a.kind === "kine"
                      ? "Supprime ce kiné de test, ses patients de test et toutes leurs données. Définitif."
                      : "Supprime ce patient de test et toutes ses données. Définitif."}
                  </p>
                  <form action={deleteTestAccountAction} className="mt-2">
                    <input type="hidden" name="id" value={a.app_id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Confirmer la suppression
                    </button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
