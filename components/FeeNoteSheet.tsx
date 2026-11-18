import { useLocale, useTranslations } from "next-intl";
import { eurosFR, periodLabel } from "@/lib/billing/reviewModel";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";
import { paymentLabel, type FeeNote } from "@/lib/billing/feeNotes";
import { moneyLabel } from "@/lib/billing/patientPlans";

// Une note d'honoraires imprimable (une page A4). Mentions : voir
// lib/billing/feeNotes.ts.
// Langue du document = celle de la personne connectée ; en anglais, les
// mentions légales françaises restent visibles entre parenthèses.
// Kiné hors France (2026-11-18) : mentions de son pays (billing.json →
// feeNoteCountry.<PAYS>, BROUILLONS à faire relire), sans aucune mention
// française (« hors nomenclature », Assurance Maladie, CGI).
export default function FeeNoteSheet({ note }: { note: FeeNote }) {
  const t = useTranslations("billing.feeNote");
  const tf = useTranslations("billing.format");
  const locale = useLocale() as Locale;
  const tc = useTranslations("billing.feeNoteCountry");
  const france = note.kine.country === "FR";
  const cKey = ["CH", "IE", "GB", "CA", "US"].includes(note.kine.country) ? note.kine.country : "default";
  const eur = (cents: number) =>
    note.currency === "eur" ? tf("eur", { amount: eurosFR(cents, 2, locale) }) : moneyLabel(cents, note.currency, locale, (amount) => tf("eur", { amount }));
  return (
    <article className="mx-auto w-full max-w-[720px] break-after-page rounded-2xl border border-line bg-white p-8 text-ink shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none max-sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{note.kine.name}</p>
          <p className="text-sm text-muted">{france ? t("profession") : tc(`${cKey}.profession`)}</p>
          {note.kine.cabinet && <p className="text-sm">{note.kine.cabinet}</p>}
          {note.kine.address && <p className="whitespace-pre-line text-sm">{note.kine.address}</p>}
          {france && note.kine.rpps && <p className="text-sm">{t("rpps", { rpps: note.kine.rpps })}</p>}
          {!france && note.kine.professionalId && <p className="text-sm">{tc(`${cKey}.id`, { id: note.kine.professionalId })}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">{t("title")}</p>
          <p className="text-sm">{t("number", { number: note.number })}</p>
          <p className="text-sm">{t("date", { date: new Date(note.validatedAt).toLocaleDateString(intlTag(locale)) })}</p>
        </div>
      </header>

      <p className="mt-8 text-sm">
        <span className="text-muted">{t("patient")}</span>
        <span className="font-medium">{note.patientName}</span>
      </p>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="py-2 font-medium">{t("designation")}</th>
            <th className="py-2 text-right font-medium">{t("amount")}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line align-top">
            <td className="py-3 pr-4">
              {france ? t("line", { period: periodLabel(note.period, locale) }) : tc(`${cKey}.line`, { period: periodLabel(note.period, locale) })}
              <span className="block text-xs text-muted">
                {france ? t("lineDetail") : tc(`${cKey}.lineDetail`)}
              </span>
            </td>
            <td className="py-3 text-right tabular-nums">{eur(note.amountCents)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-3 text-right font-semibold">{t("total")}</td>
            <td className="pt-3 text-right font-semibold tabular-nums">{eur(note.amountCents)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-8 space-y-1 text-xs text-muted">
        <p>{france ? t("notReimbursed") : tc(`${cKey}.legal`)}</p>
        {(france || tc(`${cKey}.vat`)) && <p>{france ? t("vat") : tc(`${cKey}.vat`)}</p>}
        <p>{paymentLabel(note, locale)}.</p>
      </div>
    </article>
  );
}
