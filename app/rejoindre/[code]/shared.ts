// Noms partagés entre la page /rejoindre/<code> et son action serveur (un
// fichier « use server » ne peut exporter que des fonctions).

/** Cookie de quelques minutes : l'e-mail à afficher sur « Vérifiez vos e-mails ». */
export const JOIN_EMAIL_COOKIE = "join_email";
/** Champ piège invisible : seuls les robots le remplissent. */
export const JOIN_HONEYPOT_FIELD = "website";
