// =============================================================================
// Mesure d'audience (PostHog) — ce qui part, et ce qui ne part jamais.
// Philippe, 2026-11-04 : site public + tableau de bord kiné seulement, sans
// cookie ni bandeau de consentement.
//
// Règles :
// - Seules les pages de la liste TRACKED_PREFIXES sont mesurées. L'espace
//   patient (/patient), les documents (notes d'honoraires, programme
//   imprimé), l'admin, les invitations et l'API ne le sont JAMAIS : ce sont
//   des données de santé ou des données personnelles, et PostHog n'est pas
//   un hébergeur certifié HDS. Une nouvelle page n'est pas mesurée tant
//   qu'on ne l'ajoute pas ici (liste blanche, pas liste noire).
// - Dans les adresses, les identifiants (uuid) deviennent « :id », les
//   paramètres (?…) et ancres (#…) sont retirés, les e-mails masqués.
// - Le titre de l'onglet n'est pas envoyé (il peut contenir le nom d'un
//   patient) ; le texte des boutons cliqués est masqué à la source
//   (mask_all_text dans instrumentation-client.ts).
// =============================================================================

const TRACKED_PREFIXES = [
  "/praticiens",
  "/demo",
  "/signup",
  "/login",
  "/forgot-password",
  "/cgu",
  "/confidentialite",
  "/mentions-legales",
  "/dashboard",
];

export function isTrackedPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return true;
  return TRACKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const EMAIL = /[^\s"'<>/?#&=]+@[^\s"'<>/?#&=]+\.[a-z]{2,}/gi;

/** Retire de n'importe quel texte les identifiants et les e-mails. */
export function scrubText(text: string): string {
  return text.replace(UUID, ":id").replace(EMAIL, ":email");
}

/** Adresse sans paramètres ni ancre, identifiants remplacés. Une adresse
 *  d'une page non mesurée (ex. un referrer /patient/…) est réduite à son
 *  site d'origine. */
export function scrubUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = isTrackedPath(u.pathname) ? scrubText(u.pathname) : "/";
    return `${u.origin}${path}`;
  } catch {
    return scrubText(url.split(/[?#]/)[0]);
  }
}

const URL_PROPS = ["$current_url", "$referrer", "$initial_referrer", "$prev_pageview_url"];
const PATH_PROPS = ["$pathname", "$prev_pageview_pathname"];
const DROPPED_PROPS = ["title", "$title", "$el_text"];

type Props = Record<string, unknown>;

/** Nettoie un événement avant envoi ; null = on ne l'envoie pas. */
export function scrubEvent<T extends { properties?: Props; $set?: Props; $set_once?: Props } | null>(
  event: T,
  pathname: string,
): T | null {
  if (!event || !isTrackedPath(pathname)) return null;
  for (const bag of [event.properties, event.$set, event.$set_once]) {
    if (!bag) continue;
    for (const k of URL_PROPS) if (typeof bag[k] === "string") bag[k] = scrubUrl(bag[k] as string);
    for (const k of PATH_PROPS) {
      const v = bag[k];
      if (typeof v === "string") bag[k] = isTrackedPath(v) ? scrubText(v) : "/";
    }
    for (const k of DROPPED_PROPS) delete bag[k];
    // Liens et attributs des éléments cliqués (autocapture).
    if (typeof bag.$elements_chain === "string") bag.$elements_chain = scrubText(bag.$elements_chain);
    if (Array.isArray(bag.$elements)) bag.$elements = JSON.parse(scrubText(JSON.stringify(bag.$elements)));
  }
  return event;
}
