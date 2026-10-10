// Cartes Clerk (inscription, invitation) sur écran peu haut — petit téléphone
// ou portable de 13" : marges et espacements internes resserrés pour que la
// page tienne sans défiler (audit des formats d'écran, 2026-10-10). Même
// seuil que la variante Tailwind `short:` (globals.css). À étaler dans
// `appearance.elements`. Sans effet sur un écran de plus de 800 px de haut.
const SHORT = "@media (max-height: 800px)";

export const compactClerkElements = {
  card: { [SHORT]: { padding: "1rem 1.75rem 0.875rem", gap: "0.75rem" } },
  header: { [SHORT]: { gap: "0.125rem" } },
  main: { [SHORT]: { gap: "0.75rem" } },
  form: { [SHORT]: { gap: "0.625rem" } },
  formFieldRow: { [SHORT]: { gap: "0.5rem" } },
  footerAction: { [SHORT]: { padding: "0.625rem 1rem" } },
};
