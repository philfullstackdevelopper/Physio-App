// =============================================================================
// Envoi d'e-mails par la boîte d'EasyPhysio (2026-11-19).
//
// Pourquoi : l'e-mail d'invitation envoyé par Clerk (gros bouton, logo, texte
// anglais, envoi de masse) tombe dans l'onglet « Promotions » de Gmail. Un
// e-mail simple, en texte, envoyé depuis une vraie boîte (contact@easyphysio.fr
// chez OVH) arrive bien plus souvent dans la boîte principale.
//
// Réglage : variable Scalingo SMTP_URL, par exemple
//   smtps://contact%40easyphysio.fr:MOT_DE_PASSE@ssl0.ovh.net:465
// (le « @ » de l'adresse s'écrit %40). Philippe la règle lui-même : le mot de
// passe ne passe jamais par le code ni par Claude. Expéditeur affiché :
// EMAIL_FROM (par défaut « EasyPhysio <contact@easyphysio.fr> »).
//
// Sans SMTP_URL : emailSendingConfigured() est faux et l'appelant garde
// l'ancien comportement (e-mail de Clerk). SERVEUR UNIQUEMENT.
// =============================================================================
import "server-only";
import nodemailer from "nodemailer";

export function emailSendingConfigured(): boolean {
  return !!process.env.SMTP_URL;
}

let transport: nodemailer.Transporter | null = null;
function getTransport(): nodemailer.Transporter {
  transport ??= nodemailer.createTransport(process.env.SMTP_URL as string);
  return transport;
}

/** Envoie un e-mail en texte simple. Renvoie false en cas d'échec (détail dans les journaux). */
export async function sendPlainEmail(p: { to: string; subject: string; text: string }): Promise<boolean> {
  if (!emailSendingConfigured()) return false;
  try {
    const from = process.env.EMAIL_FROM || "EasyPhysio <contact@easyphysio.fr>";
    await getTransport().sendMail({ from, replyTo: from, to: p.to, subject: p.subject, text: p.text });
    return true;
  } catch (e) {
    console.error("sendPlainEmail: envoi impossible", e instanceof Error ? e.message : e);
    return false;
  }
}
