import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { loadMonthFeeNotes } from "@/lib/billing/feeNotes";
import { estimateStripeFeeCents } from "@/lib/billing/reviewModel";
import { csvCell, periodOf } from "@/lib/billing/reviewModel";

// Tableur des recettes d'un mois pour le comptable du kiné (nouveau modèle,
// 2026-10-24). CSV séparé par « ; », montants à la française, avec BOM pour
// qu'Excel lise bien les accents.
export const runtime = "nodejs";

const amount = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export async function GET(req: Request) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const raw = new URL(req.url).searchParams.get("period") ?? "";
  const period = /^\d{4}-\d{2}-01$/.test(raw) ? raw : periodOf(new Date());
  // Langue du document = celle de la personne connectée (mentions légales
  // françaises gardées entre parenthèses dans la version anglaise).
  // Séparateur « ; » et décimales « , » inchangés dans les deux langues.
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("billing.csv");
  const notes = await loadMonthFeeNotes(supabase, user.id, period, locale);

  const statusText = (s: (typeof notes)[number]["paymentStatus"]) =>
    ({
      paid: t("statusPaid"),
      pending: t("statusPending"),
      failed: t("statusFailed"),
      action_required: t("statusActionRequired"),
      refunded: t("statusRefunded"),
      disputed: t("statusDisputed"),
    })[s] ?? t("statusFailed");
  const header = [t("date"), t("number"), t("patient"), t("designation"), t("amount"), t("payment"), t("collectedOn"), t("stripeFees")];
  const lines = notes.map((n) =>
    [
      new Date(n.validatedAt).toLocaleDateString(intlTag(locale)),
      n.number,
      n.patientName,
      t("line"),
      amount(n.amountCents),
      statusText(n.paymentStatus),
      // Date d'encaissement : seulement pour un paiement resté encaissé.
      n.paidAt && n.paymentStatus === "paid" ? new Date(n.paidAt).toLocaleDateString(intlTag(locale)) : "",
      // Stripe garde ses frais même sur un paiement remboursé ou contesté.
      ["paid", "refunded", "disputed"].includes(n.paymentStatus) ? amount(estimateStripeFeeCents(n.amountCents)) : "",
    ]
      .map(csvCell)
      .join(";"),
  );
  const csv = "﻿" + [header.map(csvCell).join(";"), ...lines].join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t("filename", { month: period.slice(0, 7) })}"`,
      "Cache-Control": "no-store",
    },
  });
}
