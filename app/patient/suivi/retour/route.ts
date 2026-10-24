import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { finalizeFollowUpSetup } from "@/lib/billing/followUp";
import { requestOrigin } from "@/lib/requestOrigin";

// Retour de Stripe après l'enregistrement de la carte du patient (suivi
// mensuel). La session vit sur le compte Stripe de SON kiné : on la relit
// là, on active le suivi tout de suite (le webhook le fait aussi), puis
// retour à la page du suivi.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const base = await requestOrigin();
  const sessionId = new URL(req.url).searchParams.get("session_id");

  const { data: patient } = await supabase.from("patients").select("instructor_id").eq("id", user.id).maybeSingle();
  const { data: connect } = patient?.instructor_id
    ? await supabase
        .from("instructor_connect_accounts")
        .select("stripe_connect_account_id")
        .eq("instructor_id", patient.instructor_id as string)
        .maybeSingle()
    : { data: null };
  const accountId = (connect?.stripe_connect_account_id as string | null) ?? null;

  let ok = false;
  if (sessionId && accountId) {
    try {
      ok = (await finalizeFollowUpSetup(sessionId, accountId)) === user.id;
    } catch (e) {
      console.error("[patient/suivi/retour] activation impossible :", e);
    }
  }
  return NextResponse.redirect(`${base}/patient/suivi?${ok ? "ok=1" : "attente=1"}`);
}
