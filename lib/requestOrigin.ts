import { headers } from "next/headers";

// Adresse publique du site (https://hôte) pour les liens de retour envoyés à
// Stripe. Prend NEXT_PUBLIC_SITE_URL s'il est défini, sinon l'hôte de la
// requête en cours (x-forwarded-* d'abord : sur Scalingo l'app tourne derrière
// un proxy). Jamais de repli sur localhost quand on est en ligne — c'était le
// cas avant et ça renvoyait le kiné vers une page d'erreur après Stripe.
export async function requestOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.");
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}
