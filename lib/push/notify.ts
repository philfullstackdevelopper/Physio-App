import "server-only";
import { pushTokensFor } from "./db";
import { sendPush } from "./send";

/** Nouveau message kiné ⇄ patient : prévient l'autre personne sur son
 *  téléphone, si elle a l'appli. Ne lève jamais d'erreur : l'envoi du message
 *  ne doit pas échouer à cause d'une notification. */
export async function notifyNewMessage(params: { patientId: string; instructorId: string; sender: "instructor" | "patient" }) {
  try {
    const toPatient = params.sender === "instructor";
    const tokens = await pushTokensFor([toPatient ? params.patientId : params.instructorId]);
    if (tokens.length === 0) return;
    await sendPush(
      tokens.map((to) => ({
        to,
        title: "EasyPhysio",
        body: toPatient ? "Nouveau message de votre kiné." : "Nouveau message d'un patient.",
        url: toPatient ? "/patient/messages" : `/dashboard/messages?patient=${encodeURIComponent(params.patientId)}`,
      })),
    );
  } catch (e) {
    console.error("[push] notification de message impossible :", e);
  }
}
