import type { MetadataRoute } from "next";

// Fiche « appli » du site (Philippe, 2026-11-16) : c'est elle que lit le
// téléphone quand on ajoute EasyPhysio à l'écran d'accueil (iPhone : Partager →
// « Sur l'écran d'accueil » ; Android : « Installer l'appli »). Le site s'ouvre
// alors en plein écran, sans barre d'adresse, avec l'icône EasyPhysio — en
// attendant les applis App Store / Google Play (voir /patient/appli).
// start_url : la page qui envoie chacun vers son espace (kiné ou patient), ou
// vers la connexion s'il n'est pas connecté dans l'appli installée.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "EasyPhysio",
    short_name: "EasyPhysio",
    description: "Votre programme d'exercices, les messages de votre kiné et votre suivi.",
    lang: "fr",
    start_url: "/apres-connexion",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f7fb",
    theme_color: "#f5f7fb",
    icons: [
      { src: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
