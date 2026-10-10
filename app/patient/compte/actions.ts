"use server";

import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { deleteAppUserById } from "@/lib/db/admin";
import { requireUser } from "@/lib/supabase/require-user";
import { revokeCurrentSession } from "@/lib/auth/clerk-session";
import { cancelPatientSubscription } from "@/lib/billing/cancelSubscription";

// RGPD droit à l'effacement: a patient deletes their own account. Every
// table referencing patients.id has "on delete cascade" (see the
// migrations), so removing the row here removes the profile, feedback,
// logs, and messages with it.
export async function deleteMyAccount(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Réservé aux patients (audit du 2026-10-08) : appelée par un kiné, cette
  // action supprimerait son compte praticien — et, par cascade, toutes les
  // données de ses patients. La RLS ne renvoie la ligne patients qu'à son
  // propre titulaire.
  const { data: ownPatientRow } = await supabase.from("patients").select("id").eq("id", user.id).maybeSingle();
  if (!ownPatientRow) redirect("/dashboard");

  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "SUPPRIMER") {
    redirect(
      `/patient/compte?error=${encodeURIComponent(
        'Tapez exactement "SUPPRIMER" pour confirmer.',
      )}`,
    );
  }

  // (Philippe, 2026-10-07 : ordre revu.) 1) Résilier l'abonnement Stripe
  // chez le kiné AVANT tout le reste — sinon le patient continuerait d'être
  // prélevé sans plus avoir de compte pour résilier. Si Stripe échoue, on ne
  // supprime rien : le patient réessaie plus tard.
  // redirect() lève une exception interne à Next : toujours HORS des try.
  let failure: string | null = null;
  try {
    await cancelPatientSubscription(user.id);
  } catch (err) {
    console.error("deleteMyAccount: résiliation Stripe impossible", err);
    failure =
      "Impossible de résilier votre abonnement pour le moment. Rien n'a été supprimé — réessayez dans quelques minutes.";
  }
  if (failure) redirect(`/patient/compte?error=${encodeURIComponent(failure)}`);

  // 2) Les données : la ligne d'identité interne (cascade sur toutes les
  // tables du patient). Connexion directe, pas le client supabase-js. Si ça
  // échoue, l'identité Clerk existe encore : le patient peut se reconnecter
  // et réessayer.
  try {
    await deleteAppUserById(user.id);
  } catch (err) {
    console.error("deleteMyAccount: suppression des données impossible", err);
    failure = "Suppression des données impossible pour le moment. Votre compte est intact — réessayez dans quelques minutes.";
  }
  if (failure) redirect(`/patient/compte?error=${encodeURIComponent(failure)}`);

  // 3) EN DERNIER, l'identité Clerk (connexion, e-mail, mot de passe). Les
  // données de santé sont déjà effacées à ce stade : un échec ici est
  // seulement journalisé (identifiant orphelin, sans aucune donnée, à
  // supprimer à la main depuis le tableau de bord Clerk).
  try {
    const client = await clerkClient();
    await client.users.deleteUser(user.clerkId);
  } catch (err) {
    console.error(`deleteMyAccount: suppression Clerk impossible (clerkId ${user.clerkId})`, err);
  }

  await revokeCurrentSession();
  redirect("/login?deleted=1");
}
