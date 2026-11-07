import { NextResponse } from "next/server";
import { reminderTokens } from "@/lib/push/db";
import { sendPush } from "@/lib/push/send";

// Rappel de séance, une fois par jour (cron.json → scripts/cron-rappels.mjs) :
// « votre séance du jour vous attend » aux patients qui ont un programme, pas
// de séance faite depuis hier, et l'appli installée. Protégé par CRON_SECRET
// (Authorization: Bearer …).
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const tokens = await reminderTokens();
  const result = await sendPush(tokens.map((to) => ({ to, title: "EasyPhysio", body: "Votre séance du jour vous attend.", url: "/patient" })));
  return NextResponse.json({ targets: tokens.length, ...result });
}
