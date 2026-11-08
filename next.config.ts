import path from "node:path";
import type { NextConfig } from "next";

// Langues de l'interface (français / anglais) : next-intl lit la langue du
// cookie et charge les textes de messages/<langue>/ (i18n/request.ts).
// On indique directement à Next où se trouve ce fichier (alias
// « next-intl/config »), au lieu d'utiliser next-intl/plugin : ce plugin
// charge aussi un outil d'extraction de textes (compilateur SWC natif) que
// le serveur de build de Scalingo refuse d'exécuter (2026-11-08), et dont
// on ne se sert pas.
const I18N_REQUEST_CONFIG = "./i18n/request.ts";

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
  // Mesure d'audience PostHog (instrumentation-client.ts) : les envois passent
  // par /ingest sur notre domaine, réécrit vers PostHog UE (Francfort).
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://eu.i.posthog.com/:path*" },
    ];
  },
  async headers() {
    return ["/exercise-illustrations/:path*", "/exercise-illustrations-draft/:path*", "/body-parts/:path*"].map((source) => ({
      source,
      headers: [{ key: "Cache-Control", value: ILLUSTRATION_CACHE }],
    }));
  },
  // next-intl : emplacement de la configuration des langues (voir en haut).
  turbopack: {
    resolveAlias: { "next-intl/config": I18N_REQUEST_CONFIG },
  },
  webpack(config) {
    config.resolve.alias["next-intl/config"] = path.resolve(I18N_REQUEST_CONFIG);
    return config;
  },
};

export default nextConfig;
