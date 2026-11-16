import { NextResponse } from "next/server";
import { forgetPushTokens } from "@/lib/push/db";
import { isExpoPushToken } from "@/lib/push/send";
import { parseWebPushToken, webPushToken } from "@/lib/push/webToken";

// Déconnexion dans l'appli (components/AppBridge.tsx) ou dans le site installé
// sur l'écran d'accueil (components/WebPushPrompt.tsx) : ce téléphone ne doit
// plus recevoir les notifications du compte. Appelé APRÈS la déconnexion,
// donc sans session : il suffit de connaître le jeton / l'abonnement (une
// longue chaîne aléatoire que seul ce téléphone possède) ; au pire, un tiers
// qui le connaîtrait couperait les notifications de ce téléphone.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: unknown; platform?: unknown; subscription?: unknown } | null;
  let token: string | null = null;
  if (body?.platform === "web") {
    const sub = parseWebPushToken(body.subscription);
    token = sub ? webPushToken(sub) : null;
  } else if (body && isExpoPushToken(body.token)) {
    token = body.token;
  }
  if (!token) return NextResponse.json({ error: "Jeton invalide." }, { status: 400 });
  try {
    await forgetPushTokens([token]);
  } catch (e) {
    console.error("[push] retrait impossible :", e);
  }
  return NextResponse.json({ ok: true });
}
