import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { loadMonthFeeNotes } from "@/lib/billing/feeNotes";
import { estimateStripeFeeCents } from "@/lib/billing/platformFee";
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
  const notes = await loadMonthFeeNotes(supabase, user.id, period);

  const header = ["Date", "N° note d'honoraires", "Patient", "Désignation", "Montant (€)", "Paiement", "Date d'encaissement", "Frais Stripe estimés (€)"];
  const lines = notes.map((n) =>
    [
      new Date(n.validatedAt).toLocaleDateString("fr-FR"),
      n.number,
      n.patientName,
      "Bilan de suivi à distance (acte non remboursable)",
      amount(n.amountCents),
      n.paymentStatus === "paid" ? "Encaissé" : n.paymentStatus === "pending" ? "En cours" : "Refusé",
      n.paidAt ? new Date(n.paidAt).toLocaleDateString("fr-FR") : "",
      n.paymentStatus === "paid" ? amount(estimateStripeFeeCents(n.amountCents)) : "",
    ]
      .map(csvCell)
      .join(";"),
  );
  const csv = "﻿" + [header.map(csvCell).join(";"), ...lines].join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recettes-easyphysio-${period.slice(0, 7)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
