// Code postal et ville tirés d'une adresse saisie librement (« 12 rue X,
// 69001 Lyon »), pour que les collègues retrouvent le cabinet en cherchant sa
// ville. Meilleur effort : rien trouvé → null, le cabinet reste trouvable par
// son nom.
export function splitPostalCity(address: string): { postalCode: string | null; city: string | null } {
  const m = /\b(\d{5})\s+([A-Za-zÀ-ÿ'’ -]{2,60})\s*$/.exec(address.trim());
  if (m) return { postalCode: m[1], city: m[2].trim() };
  return { postalCode: null, city: null };
}
