// Notes d'honoraires et récapitulatif mensuel des programmes facturés.
// Lecture par la session de la personne connectée : le kiné voit les notes
// de SES patients, le patient ne voit que les siennes (RLS, migration 0071).
// Mentions de la note : identité et RPPS du kiné, patient, date, acte non
// remboursable, exonération de TVA des soins (art. 261-4-1° CGI).
// Une note survit à la suppression du patient (audit du 2026-11-10, migration
// 0089) : le kiné la garde dans son récapitulatif et son CSV, avec le nom du
// patient recopié sur la note à son émission.
import type { SupabaseClient } from "@supabase/supabase-js";
import { feeNoteNumber, feeNotePatientName, nextPeriod } from "./reviewModel";
import type { ReviewPaymentStatus } from "./reviewPayment";
import type { Locale } from "@/i18n/locales";
import { intlTag, libTranslator } from "@/lib/i18n/translator";
import fr from "@/messages/fr/billing.json";
import en from "@/messages/en/billing.json";

export type FeeNote = {
  id: string;
  number: string;
  period: string;
  validatedAt: string;
  amountCents: number;
  paymentStatus: ReviewPaymentStatus;
  paidAt: string | null;
  patientName: string;
  kine: { name: string; cabinet: string | null; address: string | null; rpps: string | null };
};

type Row = {
  id: string;
  /** Vide quand le patient a été supprimé : la note reste (migration 0089). */
  patient_id: string | null;
  /** Nom du patient recopié sur la note à son émission (migration 0089). */
  patient_name: string | null;
  instructor_id: string;
  period: string;
  validated_at: string;
  amount_cents: number;
  payment_status: FeeNote["paymentStatus"];
  paid_at: string | null;
  fee_note_year: number;
  fee_note_seq: number;
};

const FIELDS = "id, patient_id, patient_name, instructor_id, period, validated_at, amount_cents, payment_status, paid_at, fee_note_year, fee_note_seq";

async function toNotes(supabase: SupabaseClient, rows: Row[], locale: Locale = "fr"): Promise<FeeNote[]> {
  if (rows.length === 0) return [];
  const t = libTranslator(locale, { fr, en }, "feeNote");
  const patientIds = [...new Set(rows.map((r) => r.patient_id).filter((id): id is string => !!id))];
  const kineIds = [...new Set(rows.map((r) => r.instructor_id))];
  const [{ data: patients }, { data: kines }] = await Promise.all([
    patientIds.length ? supabase.from("patients").select("id, full_name").in("id", patientIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    supabase.from("instructors").select("id, full_name, cabinet_name, cabinet_address, rpps_number").in("id", kineIds),
  ]);
  const patientName = new Map((patients ?? []).filter((p) => !!p.full_name).map((p) => [p.id as string, p.full_name as string]));
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
      patientName: feeNotePatientName({
        currentName: r.patient_id ? (patientName.get(r.patient_id) ?? null) : null,
        nameOnNote: r.patient_name,
        fallback: t("fallbackPatient"),
      }),
      kine: {
        name: (k?.full_name as string | null) ?? t("profession"),
        cabinet: (k?.cabinet_name as string | null) ?? null,
        address: (k?.cabinet_address as string | null) ?? null,
        rpps: (k?.rpps_number as string | null) ?? null,
      },
    };
  });
}

/** Les bilans d'un mois pour un kiné, par numéro de note. */
export async function loadMonthFeeNotes(supabase: SupabaseClient, instructorId: string, period: string, locale: Locale = "fr"): Promise<FeeNote[]> {
  const { data } = await supabase
    .from("monthly_reviews")
    .select(FIELDS)
    .eq("instructor_id", instructorId)
    .eq("period", period)
    .lt("period", nextPeriod(period))
    .order("fee_note_seq", { ascending: true });
  return toNotes(supabase, (data ?? []) as Row[], locale);
}

/** Une note précise (kiné ou patient : la RLS ne renvoie que ce qu'on a le droit de voir). */
export async function loadFeeNote(supabase: SupabaseClient, reviewId: string, locale: Locale = "fr"): Promise<FeeNote | null> {
  const { data } = await supabase.from("monthly_reviews").select(FIELDS).eq("id", reviewId).maybeSingle();
  if (!data) return null;
  return (await toNotes(supabase, [data as Row], locale))[0] ?? null;
}

export function paymentLabel(n: Pick<FeeNote, "paymentStatus" | "paidAt">, locale: Locale = "fr"): string {
  const t = libTranslator(locale, { fr, en }, "feeNote");
  if (n.paymentStatus === "paid") {
    return n.paidAt ? t("paidOn", { date: new Date(n.paidAt).toLocaleDateString(intlTag(locale)) }) : t("paid");
  }
  if (n.paymentStatus === "pending") return t("pending");
  if (n.paymentStatus === "action_required") return t("actionRequired");
  if (n.paymentStatus === "refunded") return t("refunded");
  if (n.paymentStatus === "disputed") return t("disputed");
  return t("failed");
}

/** Mois d'honoraires que le patient peut régler lui-même (refusés, ou validation demandée par sa banque). */
export async function loadUnpaidReviews(
  supabase: SupabaseClient,
  patientId: string,
): Promise<{ id: string; period: string; amountCents: number; status: "failed" | "action_required" }[]> {
  const { data } = await supabase
    .from("monthly_reviews")
    .select("id, period, amount_cents, payment_status")
    .eq("patient_id", patientId)
    .in("payment_status", ["failed", "action_required"])
    .order("period", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    period: r.period as string,
    amountCents: r.amount_cents as number,
    status: r.payment_status as "failed" | "action_required",
  }));
}
