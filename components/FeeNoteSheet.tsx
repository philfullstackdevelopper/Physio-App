import { eurosFR, periodLabel } from "@/lib/billing/reviewModel";
import { paymentLabel, type FeeNote } from "@/lib/billing/feeNotes";

// Une note d'honoraires imprimable (une page A4). Mentions : à faire relire
// par l'avocat / le comptable avant le lancement (voir lib/billing/feeNotes.ts).
export default function FeeNoteSheet({ note }: { note: FeeNote }) {
  return (
    <article className="mx-auto w-full max-w-[720px] break-after-page rounded-2xl border border-line bg-white p-8 text-ink shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none max-sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{note.kine.name}</p>
          <p className="text-sm text-muted">Masseur-kinésithérapeute</p>
          {note.kine.cabinet && <p className="text-sm">{note.kine.cabinet}</p>}
          {note.kine.address && <p className="whitespace-pre-line text-sm">{note.kine.address}</p>}
          {note.kine.rpps && <p className="text-sm">N° RPPS : {note.kine.rpps}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">Note d&apos;honoraires</p>
          <p className="text-sm">N° {note.number}</p>
          <p className="text-sm">Date : {new Date(note.validatedAt).toLocaleDateString("fr-FR")}</p>
        </div>
      </header>

      <p className="mt-8 text-sm">
        <span className="text-muted">Patient : </span>
        <span className="font-medium">{note.patientName}</span>
      </p>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="py-2 font-medium">Désignation</th>
            <th className="py-2 text-right font-medium">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line align-top">
            <td className="py-3 pr-4">
              Bilan de suivi à distance, {periodLabel(note.period)}
              <span className="block text-xs text-muted">
                Analyse des séances et ressentis, ajustement du programme.
              </span>
            </td>
            <td className="py-3 text-right tabular-nums">{eurosFR(note.amountCents)} €</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-3 text-right font-semibold">Total</td>
            <td className="pt-3 text-right font-semibold tabular-nums">{eurosFR(note.amountCents)} €</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-8 space-y-1 text-xs text-muted">
        <p>Acte non remboursable par l&apos;Assurance Maladie.</p>
        <p>TVA non applicable, art. 261-4-1° du CGI.</p>
        <p>{paymentLabel(note)}.</p>
      </div>
    </article>
  );
}
