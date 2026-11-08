import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { intlTag } from "@/lib/i18n/translator";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { loadFeeNote, loadMonthFeeNotes, type FeeNote } from "@/lib/billing/feeNotes";
import { estimateStripeFeeCents } from "@/lib/billing/reviewModel";
import { eurosFR, nextPeriod, periodLabel, periodOf } from "@/lib/billing/reviewModel";
import FeeNoteSheet from "@/components/FeeNoteSheet";
import PrintButton from "@/components/PrintButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing.documents");
  return { title: t("metaTitle"), robots: { index: false } };
}

// Documents imprimables (nouveau modèle, 2026-10-24), hors de la mise en page
// du tableau de bord pour s'imprimer proprement :
//   ?review=<id>                  une note d'honoraires (kiné ou patient)
//   ?period=AAAA-MM-01&type=notes toutes les notes du mois (kiné)
//   ?period=AAAA-MM-01&type=recap le récapitulatif des recettes du mois (kiné)
export default async function HonorairesDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ review?: string; period?: string; type?: string }>;
}) {
  const { review, period: rawPeriod, type } = await searchParams;
  const supabase = await createClient();
  // Langue du document = celle de la personne connectée.
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("billing.documents");

  if (review) {
    await requireUser(supabase);
    const note = await loadFeeNote(supabase, review, locale);
    if (!note) notFound();
    return (
      <Shell title={t("noteTitle", { number: note.number })}>
        <FeeNoteSheet note={note} />
      </Shell>
    );
  }

  const { user } = await requireApprovedInstructor(supabase);
  const period = /^\d{4}-\d{2}-01$/.test(rawPeriod ?? "") ? (rawPeriod as string) : periodOf(new Date());
  const notes = await loadMonthFeeNotes(supabase, user.id, period, locale);

  if (type === "notes") {
    return (
      <Shell title={t("notesTitle", { period: periodLabel(period, locale) })}>
        {notes.length === 0 ? (
          <Empty period={period} />
        ) : (
          <div className="space-y-6 print:space-y-0">
            {notes.map((n) => (
              <FeeNoteSheet key={n.id} note={n} />
            ))}
          </div>
        )}
      </Shell>
    );
  }

  const { data: invoice } = await supabase
    .from("platform_invoices")
    .select("amount_cents, status, patient_count")
    .eq("instructor_id", user.id)
    .eq("period_start", period)
    .maybeSingle();
  return (
    <Shell title={t("recapTitle", { period: periodLabel(period, locale) })}>
      <Recap notes={notes} period={period} invoice={invoice as { amount_cents: number; status: string; patient_count: number } | null} />
    </Shell>
  );
}

async function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const locale = await getLocale();
  const tc = await getTranslations("common");
  return (
    <main className="min-h-screen bg-app-bg px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[720px] flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        <PrintButton />
      </div>
      {/* Traduction des mentions légales à faire relire : le français fait foi. */}
      {locale !== "fr" && (
        <p className="mx-auto mb-4 max-w-[720px] rounded-xl bg-warn-soft px-4 py-2 text-xs text-warn print:hidden">{tc("reviewBanner")}</p>
      )}
      {children}
    </main>
  );
}

async function Empty({ period }: { period: string }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("billing.documents");
  return (
    <p className="mx-auto max-w-[720px] rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
      {t("empty", { period: periodLabel(period, locale) })}
    </p>
  );
}

async function Recap({
  notes,
  period,
  invoice,
}: {
  notes: FeeNote[];
  period: string;
  invoice: { amount_cents: number; status: string; patient_count: number } | null;
}) {
  const sum = (f: (n: FeeNote) => boolean) => notes.filter(f).reduce((s, n) => s + n.amountCents, 0);
  const paid = notes.filter((n) => n.paymentStatus === "paid");
  const paidCents = sum((n) => n.paymentStatus === "paid");
  const pendingCents = sum((n) => n.paymentStatus === "pending");
  const failedCents = sum((n) => n.paymentStatus === "failed");
  const stripeCents = paid.reduce((s, n) => s + estimateStripeFeeCents(n.amountCents), 0);
  const kine = notes[0]?.kine;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("billing.documents");
  const tf = await getTranslations("billing.format");
  const eur = (cents: number) => tf("eur", { amount: eurosFR(cents, 2, locale) });
  const lastDay = new Date(new Date(`${nextPeriod(period)}T00:00:00Z`).getTime() - 86_400_000).toLocaleDateString(intlTag(locale), { timeZone: "UTC" });

  return (
    <article className="mx-auto w-full max-w-[720px] rounded-2xl border border-line bg-white p-8 text-ink shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none max-sm:p-5">
      <header>
        <p className="text-xl font-semibold">{t("recapTitle", { period: periodLabel(period, locale) })}</p>
        {kine && (
          <p className="mt-1 text-sm text-muted">
            {kine.name}
            {kine.cabinet ? ` · ${kine.cabinet}` : ""}
            {kine.rpps ? ` · RPPS ${kine.rpps}` : ""}
          </p>
        )}
        <p className="mt-1 text-xs text-muted">{t("recapScope", { period: periodLabel(period, locale), end: lastDay })}</p>
      </header>

      {notes.length === 0 ? (
        <p className="mt-6 text-sm text-muted">{t("recapEmpty")}</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-2 font-medium">{t("colDate")}</th>
              <th className="py-2 font-medium">{t("colNumber")}</th>
              <th className="py-2 font-medium">{t("colPatient")}</th>
              <th className="py-2 font-medium">{t("colPayment")}</th>
              <th className="py-2 text-right font-medium">{t("colAmount")}</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((n) => (
              <tr key={n.id} className="border-b border-line">
                <td className="py-2">{new Date(n.validatedAt).toLocaleDateString(intlTag(locale))}</td>
                <td className="py-2 tabular-nums">{n.number}</td>
                <td className="py-2">{n.patientName}</td>
                <td className="py-2">{n.paymentStatus === "paid" ? t("statusPaid") : n.paymentStatus === "pending" ? t("statusPending") : t("statusFailed")}</td>
                <td className="py-2 text-right tabular-nums">{eur(n.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <dl className="mt-6 space-y-1 text-sm">
        <Line label={t("collected")} value={eur(paidCents)} strong />
        {pendingCents > 0 && <Line label={t("pending")} value={eur(pendingCents)} />}
        {failedCents > 0 && <Line label={t("failed")} value={eur(failedCents)} />}
        <Line label={t("stripeFees")} value={eur(stripeCents)} />
        {invoice && <Line label={t("invoice", { count: invoice.patient_count })} value={eur(invoice.amount_cents)} />}
      </dl>

      <p className="mt-8 text-xs text-muted">{t("taxNote")}</p>
    </article>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? "font-semibold" : "text-muted"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
