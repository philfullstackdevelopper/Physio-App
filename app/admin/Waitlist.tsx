"use client";

import { useState } from "react";
import { Check, Copy, MailPlus } from "lucide-react";
import type { WaitlistRow } from "@/lib/db/admin";
import { removeFromWaitlist } from "./waitlistAdminActions";

// Liste d'attente du lancement (Philippe, 2026-10-12) : les e-mails laissés sur
// la page d'accueil. Aucun envoi automatique — « Copier les adresses » sert à
// les coller dans le champ Cci de sa messagerie le jour du lancement.

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function Waitlist({ rows }: { rows: WaitlistRow[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const kines = rows.filter((r) => r.role === "kine");
  const patients = rows.filter((r) => r.role === "patient");

  async function copy(label: string, list: WaitlistRow[]) {
    try {
      await navigator.clipboard.writeText(list.map((r) => r.email).join(", "));
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  const copyButton = (label: string, list: WaitlistRow[]) => (
    <button
      type="button"
      onClick={() => copy(label, list)}
      disabled={list.length === 0}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
    >
      {copied === label ? <Check className="h-4 w-4 text-emerald-600" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={1.75} />}
      {copied === label ? "Copié" : `Copier les adresses ${label} (${list.length})`}
    </button>
  );

  return (
    <section id="liste-attente" className="mt-12 scroll-mt-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-slate-900">
        <MailPlus className="h-5 w-5 text-blue-600" strokeWidth={1.75} />
        Liste d&apos;attente
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {rows.length === 0
          ? "Personne ne s'est encore inscrit depuis la page d'accueil."
          : `${rows.length} inscrit${rows.length > 1 ? "s" : ""} : ${kines.length} kiné${kines.length > 1 ? "s" : ""}, ${patients.length} patient${patients.length > 1 ? "s" : ""}. Aucun e-mail n'est envoyé automatiquement.`}
      </p>

      {rows.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {copyButton("kinés", kines)}
            {copyButton("patients", patients)}
          </div>
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {rows.map((r) => (
              <li key={r.email} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <div className="min-w-0">
                  <p className="select-all break-all text-sm text-slate-900">{r.email}</p>
                  <p className="text-xs text-slate-400">
                    {r.role === "kine" ? "Kiné" : "Patient"} · {dateFmt.format(new Date(r.created_at))}
                  </p>
                </div>
                <form action={removeFromWaitlist} className="shrink-0">
                  <input type="hidden" name="email" value={r.email} />
                  <button type="submit" className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-red-600 hover:underline">
                    Retirer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
