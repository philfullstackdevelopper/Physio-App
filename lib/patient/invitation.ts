// =============================================================================
// Invitation Clerk d'un patient — un seul endroit pour les trois chemins qui
// en envoient : le kiné ajoute un patient (addPatient), le kiné la renvoie
// (reactivatePatient), le patient scanne le QR code (joinViaLink).
//
// Données de santé (audit HDS, 2026-11-08) : Clerk est hébergé aux USA et non
// certifié HDS. Il ne doit pas pouvoir savoir qu'une personne est suivie par
// un kiné : ni « role: patient » ni nom du kiné dans les métadonnées, ni nom
// du kiné dans l'adresse de retour (Clerk la conserve). /invitation affiche
// alors « Votre kinésithérapeute ». Seul le nom de la personne part chez
// Clerk, comme pour n'importe quel compte.
//
// redirectUrl doit pointer vers une page qui affiche <SignUp/> : c'est elle
// qui lit le __clerk_ticket ajouté par Clerk (bug du 2026-09-09 : l'ancien
// champ `redirectTo` n'existait pas et Clerk l'ignorait).
//
// SERVEUR UNIQUEMENT.
// =============================================================================
import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/shared/error";
import { requestOrigin } from "@/lib/requestOrigin";

/** Durée de validité d'une invitation, fixée explicitement (audit du 2026-11-08). */
export const PATIENT_INVITATION_DAYS = 30;

/**
 * sent      : invitation envoyée ;
 * pending   : une invitation est déjà en cours pour cette adresse ;
 * duplicate : un compte Clerk existe déjà avec cette adresse ;
 * failed    : autre échec (détail dans les journaux du serveur seulement).
 */
export type InviteOutcome = "sent" | "pending" | "duplicate" | "failed";

export async function invitePatient(email: string, fullName: string | null, context: string): Promise<InviteOutcome> {
  try {
    const client = await clerkClient();
    const origin = await requestOrigin();
    await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${origin}/invitation`,
      publicMetadata: { full_name: fullName },
      expiresInDays: PATIENT_INVITATION_DAYS,
    });
    return "sent";
  } catch (e) {
    // Le détail utile est dans `.errors[]`, jamais dans `.message` (résumé
    // générique). Il reste côté serveur : jamais dans une adresse ni à l'écran.
    const clerkErrors = isClerkAPIResponseError(e) ? e.errors : [];
    if (clerkErrors.some((ce) => ce.code === "invitation_already_pending" || ce.code === "duplicate_invitation")) {
      return "pending";
    }
    console.error(`${context}: Clerk invitation failed`, clerkErrors.length ? clerkErrors : e);
    if (clerkErrors.some((ce) => ce.code === "duplicate_record" || ce.code === "form_identifier_exists")) {
      return "duplicate";
    }
    return "failed";
  }
}
