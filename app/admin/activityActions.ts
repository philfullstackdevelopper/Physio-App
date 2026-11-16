"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { isAdminEmail } from "@/lib/admin";
import { pushTokensFor } from "@/lib/push/db";
import { sendPush, type PushMessage } from "@/lib/push/send";
import { getLocaleByAppId } from "@/lib/db/locale";
import { loadActivity } from "@/lib/activity/load";
import { kineNeedsNudge, patientNeedsNudge } from "@/lib/activity/activity";
import type { Locale } from "@/i18n/locales";

// Relances depuis la vue « Activité » de /admin : une notification sur le
// téléphone (appli mobile ou site installé), jamais d'e-mail. Le texte est
// neutre — il s'affiche sur l'écran verrouillé : aucun nom, aucun soin.
// Seules les personnes qui ont activé les notifications peuvent être
// relancées ; la liste est recalculée ici, côté serveur, à chaque envoi.

type Kind = "patient" | "kine";

async function requireAdmin() {
  const user = await requireUser(await createClient());
  if (!isAdminEmail(user.email)) redirect("/");
}

async function messagesFor(people: { id: string; kind: Kind }[]): Promise<PushMessage[]> {
  const texts = new Map<string, string>();
  const out: PushMessage[] = [];
  for (const { id, kind } of people) {
    const tokens = await pushTokensFor([id]);
    if (tokens.length === 0) continue;
    const locale: Locale = await getLocaleByAppId(id);
    const key = `${locale}:${kind}`;
    if (!texts.has(key)) {
      const t = await getTranslations({ locale, namespace: "dashboard.push" });
      texts.set(key, kind === "patient" ? t("nudgePatient") : t("nudgeKine"));
    }
    for (const to of tokens) {
      out.push({ to, title: "EasyPhysio", body: texts.get(key)!, url: kind === "patient" ? "/patient" : "/dashboard" });
    }
  }
  return out;
}

function done(sent: number, failed: number, people: number): never {
  redirect(`/admin?relance=${people}&envoyees=${sent}&echecs=${failed}#activite`);
}

/** Relance une personne (bouton « Relancer » d'une ligne). */
export async function nudgeOne(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const kind = formData.get("kind") === "kine" ? "kine" : "patient";
  if (!id) return;
  // Vérifie que la personne existe bien (et son rôle) avant d'envoyer.
  const { patients, kines } = await loadActivity();
  const known = kind === "patient" ? patients.some((p) => p.id === id) : kines.some((k) => k.id === id);
  if (!known) redirect("/admin?error=Personne%20introuvable#activite");
  const msgs = await messagesFor([{ id, kind }]);
  if (msgs.length === 0) redirect("/admin?error=Notifications%20non%20activ%C3%A9es%20pour%20cette%20personne#activite");
  const { sent, failed } = await sendPush(msgs);
  done(sent, failed, 1);
}

/** Relance tous ceux qui en ont besoin, pour un rôle (bouton en haut de liste). */
export async function nudgeAll(formData: FormData) {
  await requireAdmin();
  const kind: Kind = formData.get("kind") === "kine" ? "kine" : "patient";
  const { patients, kines } = await loadActivity();
  const targets =
    kind === "patient"
      ? patients.filter((p) => !p.isTest && patientNeedsNudge(p)).map((p) => ({ id: p.id, kind }))
      : kines.filter((k) => !k.isTest && kineNeedsNudge(k)).map((k) => ({ id: k.id, kind }));
  if (targets.length === 0) redirect("/admin?error=Personne%20%C3%A0%20relancer#activite");
  const msgs = await messagesFor(targets);
  const { sent, failed } = await sendPush(msgs);
  done(sent, failed, targets.length);
}
