import { NextResponse } from "next/server";
import { forgetPushTokens } from "@/lib/push/db";
import { isExpoPushToken } from "@/lib/push/send";

// Déconnexion dans l'appli (components/AppBridge.tsx) : ce téléphone ne doit
// plus recevoir les notifications du compte. Appelé APRÈS la déconnexion,
// donc sans session : il suffit de connaître le jeton (une longue chaîne
// aléatoire que seul ce téléphone possède) ; au pire, un tiers qui le
// connaîtrait couperait les notifications de ce téléphone.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  if (!body || !isExpoPushToken(body.token)) return NextResponse.json({ error: "Jeton invalide." }, { status: 400 });
  try {
    await forgetPushTokens([body.token]);
  } catch (e) {
    console.error("[push] retrait impossible :", e);
  }
  return NextResponse.json({ ok: true });
}
