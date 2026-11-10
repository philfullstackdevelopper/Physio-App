import { headers } from "next/headers";

// Adresse publique du site (https://hôte) pour les liens de retour envoyés à
// Stripe. Prend NEXT_PUBLIC_SITE_URL s'il est défini, sinon l'hôte de la
// requête en cours (x-forwarded-* d'abord : sur Scalingo l'app tourne derrière
// un proxy). Jamais de repli sur localhost quand on est en ligne — c'était le
// cas avant et ça renvoyait le kiné vers une page d'erreur après Stripe.
//
// En ligne (NODE_ENV = production), NEXT_PUBLIC_SITE_URL est OBLIGATOIRE
// (audit du 2026-11-10) : l'hôte de la requête (X-Forwarded-Host) est fourni
// par le visiteur, et s'en servir pour fabriquer les liens de retour de Stripe
// permettrait de renvoyer quelqu'un vers un autre site après son paiement.
export async function requestOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL manquant : adresse du site inconnue (à régler dans l'environnement Scalingo).");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.");
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}
