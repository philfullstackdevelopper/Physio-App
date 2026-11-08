import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { reminderTargets } from "@/lib/push/db";
import { sendPush } from "@/lib/push/send";
import { getLocaleByAppId } from "@/lib/db/locale";
import type { Locale } from "@/i18n/locales";

// Rappel de séance, une fois par jour (cron.json → scripts/cron-rappels.mjs) :
// « votre séance du jour vous attend » aux patients qui ont un programme, pas
// de séance faite depuis hier, et l'appli installée. Protégé par CRON_SECRET
// (Authorization: Bearer …). Chaque rappel est écrit dans la langue du patient.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const targets = await reminderTargets();
  const localeOf = new Map<string, Locale>();
  for (const { appUserId } of targets) {
    if (!localeOf.has(appUserId)) localeOf.set(appUserId, await getLocaleByAppId(appUserId));
  }
  const bodyFor = new Map<Locale, string>();
  for (const locale of new Set(localeOf.values())) {
    const t = await getTranslations({ locale, namespace: "dashboard.push" });
    bodyFor.set(locale, t("dailyReminder"));
  }
  const result = await sendPush(
    targets.map(({ appUserId, token }) => ({
      to: token,
      title: "EasyPhysio",
      body: bodyFor.get(localeOf.get(appUserId) ?? "fr") ?? "Votre séance du jour vous attend.",
      url: "/patient",
    })),
  );
  return NextResponse.json({ targets: targets.length, ...result });
}
