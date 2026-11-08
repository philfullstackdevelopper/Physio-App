import "server-only";
import { getTranslations } from "next-intl/server";
import { getLocaleByAppId } from "@/lib/db/locale";
import { pushTokensFor } from "./db";
import { sendPush } from "./send";

/** Nouveau message kiné ⇄ patient : prévient l'autre personne sur son
 *  téléphone, si elle a l'appli. Ne lève jamais d'erreur : l'envoi du message
 *  ne doit pas échouer à cause d'une notification. Texte dans la langue du
 *  destinataire (app_users.locale), pas dans celle de l'expéditeur. */
export async function notifyNewMessage(params: { patientId: string; instructorId: string; sender: "instructor" | "patient" }) {
  try {
    const toPatient = params.sender === "instructor";
    const recipientId = toPatient ? params.patientId : params.instructorId;
    const tokens = await pushTokensFor([recipientId]);
    if (tokens.length === 0) return;
    const locale = await getLocaleByAppId(recipientId);
    const t = await getTranslations({ locale, namespace: "dashboard.push" });
    await sendPush(
      tokens.map((to) => ({
        to,
        title: "EasyPhysio",
        body: toPatient ? t("messageFromPhysio") : t("messageFromPatient"),
        url: toPatient ? "/patient/messages" : `/dashboard/messages?patient=${encodeURIComponent(params.patientId)}`,
      })),
    );
  } catch (e) {
    console.error("[push] notification de message impossible :", e);
  }
}
