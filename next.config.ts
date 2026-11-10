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

// Même réglage pour les autres fichiers de public/ dont le nom ne change pas
// quand le contenu change (pas d'empreinte dans le nom) : vidéos de
// démonstration de l'accueil (≈ 0,5 Mo chacune, retéléchargées à chaque visite
// avant l'audit du 2026-11-10), photos des témoignages, logo.
const STATIC_CACHED = [
  "/exercise-illustrations/:path*",
  "/exercise-illustrations-draft/:path*",
  "/body-parts/:path*",
  "/videos-demo/:path*",
  "/testimonials/:path*",
  "/brand/:path*",
];

// -----------------------------------------------------------------------------
// En-têtes de sécurité (audit du 2026-11-10, S1).
//
// - « frame-ancestors » / X-Frame-Options : aucun autre site ne peut afficher
//   EasyPhysio dans un cadre invisible pour faire cliquer « Supprimer » ou
//   « Suspendre » à l'insu de la personne (clickjacking). L'appli mobile n'est
//   pas concernée : elle affiche le site dans une WebView (une fenêtre de
//   navigateur à part entière), pas dans un cadre.
// - HSTS n'est pas répété ici : Scalingo l'ajoute déjà.
// - La politique de contenu (CSP) est en DEUX parties. Celle qui s'applique
//   vraiment ne contient que des règles sans risque. La politique complète
//   (d'où viennent les scripts, les images, les appels réseau, vers où un
//   formulaire peut partir…) est envoyée en « Report-Only » : le navigateur ne
//   bloque rien, il écrit seulement dans sa console ce qu'il AURAIT bloqué. À
//   relire dans la console après mise en ligne (connexion Clerk, paiement
//   Stripe, vidéos, envoi d'une vidéo par un kiné) avant de la rendre
//   bloquante — une erreur ici casserait la connexion ou le paiement.
// -----------------------------------------------------------------------------
function originOf(url: string | undefined): string[] {
  try {
    return url ? [new URL(url).origin] : [];
  } catch {
    return [];
  }
}

// Base de données (PostgREST), appelée directement par le navigateur, et
// ancien stockage de vidéos Supabase s'il est encore réglé.
const DATA_ORIGINS = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const STORAGE_ORIGINS = originOf(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL);
// Clerk : instance de production (clerk.easyphysio.fr, accounts.easyphysio.fr),
// instance de développement (*.clerk.accounts.dev), fichiers et protection
// anti-robots (*.clerk.com, dont client.protect.clerk.com ; et
// challenges.cloudflare.com pour le test « êtes-vous un robot ? »).
const CLERK = [
  "https://clerk.easyphysio.fr",
  "https://accounts.easyphysio.fr",
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
];
const R2 = "https://*.r2.cloudflarestorage.com";
const STRIPE_PAGES = ["https://checkout.stripe.com", "https://connect.stripe.com", "https://billing.stripe.com"];

const REPORT_ONLY_CSP = [
  "default-src 'self'",
  // 'unsafe-inline' : Next.js insère de petits scripts dans la page ;
  // 'unsafe-eval' seulement en développement (rechargement à chaud).
  [
    "script-src 'self' 'unsafe-inline'",
    ...(process.env.NODE_ENV === "production" ? [] : ["'unsafe-eval'"]),
    ...CLERK,
    "https://challenges.cloudflare.com",
  ].join(" "),
  "style-src 'self' 'unsafe-inline'",
  ["img-src 'self' data: blob: https://img.clerk.com https://i.ytimg.com", R2, ...STORAGE_ORIGINS].join(" "),
  "font-src 'self' data:",
  ["media-src 'self' blob:", R2, ...STORAGE_ORIGINS].join(" "),
  ["connect-src 'self'", ...DATA_ORIGINS, ...STORAGE_ORIGINS, ...CLERK, "https://clerk-telemetry.com", R2].join(" "),
  "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  ["form-action 'self'", ...STRIPE_PAGES, ...CLERK].join(" "),
].join("; ");

function securityHeaders(frameAncestors: "none" | "self") {
  // Règles réellement appliquées : uniquement celles qui ne peuvent rien casser.
  const enforced = `frame-ancestors '${frameAncestors}'; base-uri 'self'; object-src 'none'`;
  return [
    { key: "X-Frame-Options", value: frameAncestors === "none" ? "DENY" : "SAMEORIGIN" },
    { key: "Content-Security-Policy", value: enforced },
    { key: "Content-Security-Policy-Report-Only", value: `${REPORT_ONLY_CSP}; ${enforced}` },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Rien dans le site n'utilise le micro, la position, l'API de paiement du
    // navigateur (Stripe se fait par redirection vers ses propres pages) ni
    // l'USB. La caméra reste permise à notre propre site : le kiné filme son
    // exercice avec l'appareil photo du téléphone (sélecteur de fichier natif,
    // qui ne dépend pas de ce réglage — gardé par prudence).
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  ];
}

const nextConfig: NextConfig = {
  // L'indicateur de dev de Next (bouton « N » en bas à gauche) recouvrait
  // « Se déconnecter » dans la sidebar du dashboard.
  devIndicators: { position: "bottom-right" },
  // Ne plus annoncer « X-Powered-By: Next.js » (audit du 2026-11-10, S1).
  poweredByHeader: false,
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
    return [
      // En-têtes de sécurité sur toutes les réponses.
      { source: "/:path*", headers: securityHeaders("none") },
      // La démo est affichée dans le téléphone de la page d'accueil (cadre de
      // NOTRE site, components/KinePhonePreview.tsx → /demo/kine) : elle seule
      // peut être mise dans un cadre, et seulement par notre propre site.
      // Cette règle vient APRÈS la règle générale : pour un même en-tête, la
      // dernière l'emporte.
      { source: "/demo/:path*", headers: securityHeaders("self") },
      ...STATIC_CACHED.map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: ILLUSTRATION_CACHE }],
      })),
    ];
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
