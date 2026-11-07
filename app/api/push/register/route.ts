import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";
import { registerPushToken } from "@/lib/push/db";
import { isExpoPushToken } from "@/lib/push/send";

// L'appli mobile (via components/AppBridge.tsx) enregistre ici le téléphone
// de la personne connectée, pour lui envoyer ses notifications.
export async function POST(req: Request) {
  const user = await requireUser();
  const body = (await req.json().catch(() => null)) as { token?: unknown; platform?: unknown } | null;
  const platform = body?.platform === "ios" || body?.platform === "android" ? body.platform : null;
  if (!body || !isExpoPushToken(body.token) || !platform) {
    return NextResponse.json({ error: "Jeton invalide." }, { status: 400 });
  }
  try {
    await registerPushToken(user.id, body.token, platform);
  } catch (e) {
    console.error("[push] enregistrement impossible :", e);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
