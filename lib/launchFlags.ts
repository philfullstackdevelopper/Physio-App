// Interrupteurs d'avant-lancement (Philippe, 2026-10-12). Fichier sans aucune
// dépendance, pour pouvoir être lu aussi bien par le serveur que par les
// composants d'affichage (en-tête, page Tarifs…).
//
// Tant que le site n'est pas lancé, le lien circule pour faire tester la
// plateforme et remplir la liste d'attente — mais personne ne doit créer de
// compte ni inviter de vrais patients :
//
//   SIGNUPS_OPEN = false
//     - /signup, /signup/kine et /signup/patient affichent « les inscriptions
//       ouvriront au lancement » avec le formulaire de liste d'attente ;
//     - /signup/finalize ne crée plus de fiche kiné ;
//     - sur la page d'accueil, les boutons « Créer un compte » deviennent
//       « Rejoindre la liste d'attente ».
//     Se connecter reste possible pour les comptes qui existent déjà : celui
//     de Philippe et les comptes de test créés depuis /admin.
//
//   PATIENT_INVITATIONS_OPEN = false
//     - « Ajouter un patient » et « Réactiver » n'envoient aucune invitation
//       (sauf pour l'administrateur — voir lib/launch.ts).
//
// LE JOUR DU LANCEMENT : passer les deux à `true`, et c'est tout.
export const SIGNUPS_OPEN = true;
export const PATIENT_INVITATIONS_OPEN = false;

/** Où mènent les boutons d'inscription tant que SIGNUPS_OPEN est faux. */
export const WAITLIST_HREF = "/#liste-attente";

// Bibliothèque d'exercices réduite aux exercices filmés (Philippe, 2026-10-31,
// « pour le moment ») : liste dans lib/exercise/filmedExercises.ts. Les autres
// exercices de la plateforme sont cachés aux kinés, pas supprimés. Passer à
// false pour tout réafficher.
export const ONLY_FILMED_EXERCISES = true;

// Abonnement des kinés à EasyPhysio (Philippe, 2026-11-02) : ARRÊTÉ. Le kiné
// s'inscrit et utilise l'appli gratuitement ; EasyPhysio se rémunère sur les
// formules payées par les patients (lib/billing/reviewModel.ts). Tant que
// c'est faux, la facturation mensuelle des kinés (cron du 1er du mois et
// bouton « Lancer la facturation » de /admin) ne facture personne.
export const KINE_SUBSCRIPTION_BILLING = false;
