// =============================================================================
// Frein simple « pas plus de N essais en X minutes » (audit du 2026-11-08 :
// la page publique /rejoindre/<code> n'en avait aucun).
//
// LIMITE ASSUMÉE : le compteur vit dans la mémoire du serveur. Il repart à
// zéro à chaque redémarrage et n'est pas partagé si Scalingo fait tourner
// plusieurs conteneurs. C'est un frein contre un robot naïf, pas une
// protection absolue — la vraie limite, elle, est en base (20 nouveaux
// patients par kiné et par 24 h, migration 0087).
// =============================================================================

export type RateWindow = { limit: number; windowMs: number };

/** Compteur à fenêtre fixe, par clé (ici : l'adresse IP). */
export function createRateLimiter({ limit, windowMs }: RateWindow, maxKeys = 10_000) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    /** Vrai si l'essai est permis (et le compte), faux s'il faut refuser. */
    allow(key: string, now: number = Date.now()): boolean {
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        // Mémoire bornée : on fait le ménage des fenêtres expirées si besoin.
        if (hits.size >= maxKeys) {
          for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
          if (hits.size >= maxKeys) hits.delete(hits.keys().next().value as string);
        }
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (entry.count >= limit) return false;
      entry.count += 1;
      return true;
    },
  };
}

/** Adresse IP du visiteur d'après les en-têtes posés par le proxy de Scalingo. */
export function clientIp(h: { get(name: string): string | null }): string {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "inconnue";
}
