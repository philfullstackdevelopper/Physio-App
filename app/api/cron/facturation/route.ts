import { timingSafeEqual } from "node:crypto";
import { periodOf, previousPeriod } from "@/lib/billing/reviewModel";
import { runMonthlyInvoicing } from "@/lib/billing/platformInvoice";

// Facturation automatique des kinés (Philippe, 2026-10-28 : « la facturation
// du kiné doit être automatique »). Appelée le 1er de chaque mois par la
// tâche planifiée Scalingo (cron.json → scripts/cron-facturation.mjs), elle
// facture le mois qui vient de se terminer — exactement comme le bouton
// « Lancer la facturation » de /admin, qui reste en secours. runMonthlyInvoicing
// ne facture jamais deux fois le même mois : un double appel est sans risque.
//
// Protégée par le secret CRON_SECRET (variable d'environnement Scalingo),
// envoyé en « Authorization: Bearer … » : sans lui, refus.
export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Non autorisé." }, { status: 401 });

  const period = previousPeriod(periodOf(new Date()));
  try {
    const r = await runMonthlyInvoicing(period);
    const summary = {
      period,
      factures: r.invoiced.filter((i) => !i.free).length,
      offerts: r.invoiced.filter((i) => i.free).length,
      sansMoyenDePaiement: r.missingPaymentMethod.length,
      dejaFactures: r.alreadyDone.length,
      erreurs: r.errors.length,
    };
    console.log("[cron facturation]", JSON.stringify(summary));
    return Response.json(summary, { status: r.errors.length ? 207 : 200 });
  } catch (e) {
    console.error("[cron facturation] échec :", e);
    return Response.json({ period, error: "Échec de la facturation." }, { status: 500 });
  }
}
