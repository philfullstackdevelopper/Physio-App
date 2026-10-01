import { redirect } from "next/navigation";

// L'ancien formulaire passait par Supabase Auth, qui n'existe plus depuis le
// passage à Clerk + Scalingo : il affichait « e-mail envoyé » sans rien
// envoyer. La réinitialisation se fait désormais dans le formulaire Clerk de
// /login (lien « Mot de passe oublié ? » sous le champ mot de passe). Cette
// route reste en redirection pour les anciens liens.
export default function ForgotPasswordPage() {
  redirect("/login");
}
