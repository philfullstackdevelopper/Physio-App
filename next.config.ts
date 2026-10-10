import type { NextConfig } from "next";

// Heure de Paris pour tout le serveur (audit du 2026-10-08) : les dates du
// programme (jour, semaine, « aujourd'hui », heure d'une séance) sont
// calculées avec l'heure locale du serveur — en UTC sur Scalingo, une séance
// faite à 00 h 30 tombait sur la veille. Le Procfile lance déjà le serveur
// avec TZ=Europe/Paris ; ceci couvre les autres lancements (npm run dev…).
process.env.TZ ||= "Europe/Paris";

// Dessins d'exercices et images des parties du corps (public/) : sans ceci,
// Next les sert avec « Cache-Control: max-age=0 » — le navigateur redemande
// chaque dessin au serveur à chaque affichage, donc à chaque clic sur une
// partie du corps dans les listes d'exercices (Philippe, 2026-10-02 : « les
// images mettent plein de temps à s'actualiser »). Un jour de cache, puis
// mise à jour en arrière-plan (stale-while-revalidate) si un dessin change.
const ILLUSTRATION_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  // L'indicateur de dev de Next (bouton « N » en bas à gauche) recouvrait
  // « Se déconnecter » dans la sidebar du dashboard.
  devIndicators: { position: "bottom-right" },
  async headers() {
    return ["/exercise-illustrations/:path*", "/exercise-illustrations-draft/:path*", "/body-parts/:path*"].map((source) => ({
      source,
      headers: [{ key: "Cache-Control", value: ILLUSTRATION_CACHE }],
    }));
  },
};

export default nextConfig;
