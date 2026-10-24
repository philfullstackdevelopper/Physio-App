// Notes d'honoraires et récapitulatif mensuel (nouveau modèle, 2026-10-24).
// Lecture par la session de la personne connectée : le kiné voit les bilans
// de SES patients, le patient ne voit que les siens (RLS, migration 0071).
// Mentions de la note : identité et RPPS du kiné, patient, date, acte non
// remboursable, exonération de TVA des soins (art. 261-4-1° CGI) — à faire
// relire par l'avocat / le comptable avant le lancement.
import type { SupabaseClient } from "@supabase/supabase-js";
import { feeNoteNumber, nextPeriod } from "./reviewModel";

export type FeeNote = {
  id: string;
  number: string;
  period: string;
  validatedAt: string;
  amountCents: number;
  paymentStatus: "pending" | "paid" | "failed";
  paidAt: string | null;
  patientName: string;
  kine: { name: string; cabinet: string | null; address: string | null; rpps: string | null };
};

type Row = {
  id: string;
  patient_id: string;
  instructor_id: string;
  period: string;
  validated_at: string;
  amount_cents: number;
  payment_status: FeeNote["paymentStatus"];
  paid_at: string | null;
  fee_note_year: number;
  fee_note_seq: number;
};

const FIELDS = "id, patient_id, instructor_id, period, validated_at, amount_cents, payment_status, paid_at, fee_note_year, fee_note_seq";

async function toNotes(supabase: SupabaseClient, rows: Row[]): Promise<FeeNote[]> {
  if (rows.length === 0) return [];
  const patientIds = [...new Set(rows.map((r) => r.patient_id))];
  const kineIds = [...new Set(rows.map((r) => r.instructor_id))];
  const [{ data: patients }, { data: kines }] = await Promise.all([
    supabase.from("patients").select("id, full_name").in("id", patientIds),
    supabase.from("instructors").select("id, full_name, cabinet_name, cabinet_address, rpps_number").in("id", kineIds),
  ]);
  const patientName = new Map((patients ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? "Patient"]));
  const kine = new Map((kines ?? []).map((k) => [k.id as string, k]));
  return rows.map((r) => {
    const k = kine.get(r.instructor_id);
    return {
      id: r.id,
      number: feeNoteNumber(r.fee_note_year, r.fee_note_seq),
      period: r.period,
      validatedAt: r.validated_at,
      amountCents: r.amount_cents,
      paymentStatus: r.payment_status,
      paidAt: r.paid_at,
      patientName: patientName.get(r.patient_id) ?? "Patient",
      kine: {
        name: (k?.full_name as string | null) ?? "Masseur-kinésithérapeute",
        cabinet: (k?.cabinet_name as string | null) ?? null,
        address: (k?.cabinet_address as string | null) ?? null,
        rpps: (k?.rpps_number as string | null) ?? null,
      },
    };
  });
}

/** Les bilans d'un mois pour un kiné, par numéro de note. */
export async function loadMonthFeeNotes(supabase: SupabaseClient, instructorId: string, period: string): Promise<FeeNote[]> {
  const { data } = await supabase
    .from("monthly_reviews")
    .select(FIELDS)
    .eq("instructor_id", instructorId)
    .eq("period", period)
    .lt("period", nextPeriod(period))
    .order("fee_note_seq", { ascending: true });
  return toNotes(supabase, (data ?? []) as Row[]);
}

/** Une note précise (kiné ou patient : la RLS ne renvoie que ce qu'on a le droit de voir). */
export async function loadFeeNote(supabase: SupabaseClient, reviewId: string): Promise<FeeNote | null> {
  const { data } = await supabase.from("monthly_reviews").select(FIELDS).eq("id", reviewId).maybeSingle();
  if (!data) return null;
  return (await toNotes(supabase, [data as Row]))[0] ?? null;
}

export function paymentLabel(n: Pick<FeeNote, "paymentStatus" | "paidAt">): string {
  if (n.paymentStatus === "paid") {
    return n.paidAt ? `Réglé par carte le ${new Date(n.paidAt).toLocaleDateString("fr-FR")}` : "Réglé par carte";
  }
  if (n.paymentStatus === "pending") return "Paiement en cours";
  return "Paiement refusé — à régulariser";
}
