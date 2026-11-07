// Liens qui ouvrent directement l'appli mobile (« universal links » chez Apple,
// « App Links » chez Google) au lieu du navigateur, quand elle est installée :
// connexion, espaces kiné et patient. Les pages vitrine restent dans le
// navigateur, et SURTOUT l'invitation / QR code du kiné (/rejoindre,
// /invitation) : le patient s'inscrit et paie sur le site, jamais dans
// l'appli (règles d'Apple), puis télécharge l'appli et s'y connecte.
//
// Les deux fichiers publiés sous /.well-known/ ont besoin d'identifiants que
// Philippe obtient en créant ses comptes développeur :
//   - APPLE_TEAM_ID : identifiant d'équipe Apple (10 caractères) ;
//   - ANDROID_CERT_SHA256 : empreinte(s) SHA-256 du certificat de l'appli
//     Android (Google Play Console → Intégrité de l'appli), séparées par des
//     virgules.
// Tant qu'ils manquent, les fichiers renvoient 404 et les liens s'ouvrent
// simplement dans le navigateur.

export const APP_BUNDLE_ID = "fr.easyphysio.app";

export const APP_LINK_PATHS = ["/login*", "/patient*", "/dashboard*", "/apres-connexion"];
