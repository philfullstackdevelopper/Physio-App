import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";
import { registerPushToken } from "@/lib/push/db";
import { isExpoPushToken } from "@/lib/push/send";
import { parseWebPushToken, webPushToken } from "@/lib/push/webToken";

// Enregistre le téléphone de la personne connectée pour lui envoyer ses
// notifications :
//   - l'appli mobile (components/AppBridge.tsx) : jeton Expo, ios / android ;
//   - le site ajouté à l'écran d'accueil (components/WebPushPrompt.tsx) :
//     abonnement web, plateforme « web » (migration 0092).
export async function POST(req: Request) {
  const user = await requireUser();
  const body = (await req.json().catch(() => null)) as { token?: unknown; platform?: unknown; subscription?: unknown } | null;

  let token: string | null = null;
  let platform: "ios" | "android" | "web" | null = null;
  if (body?.platform === "web") {
    const sub = parseWebPushToken(body.subscription);
    if (sub) {
      token = webPushToken(sub);
      platform = "web";
    }
  } else if ((body?.platform === "ios" || body?.platform === "android") && isExpoPushToken(body.token)) {
    token = body.token;
    platform = body.platform;
  }
  if (!token || !platform) {
    return NextResponse.json({ error: "Jeton invalide." }, { status: 400 });
  }
  try {
    await registerPushToken(user.id, token, platform);
  } catch (e) {
    console.error("[push] enregistrement impossible :", e);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
