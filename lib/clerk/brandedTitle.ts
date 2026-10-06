// « EasyPhysio · Se connecter » : le nom de la marque en tête du titre des
// cartes Clerk (connexion, inscription), au lieu d'un logo séparé posé à côté
// de la carte qui la chevauchait (Philippe, 2026-10-02). Clerk ne laisse pas
// injecter de JSX dans son en-tête, d'où le ::before. À passer dans
// `appearance.elements.headerTitle`.
export const brandedHeaderTitle = {
  "&::before": {
    content: '"EasyPhysio · "',
    color: "#1d4ed8",
    fontFamily: 'var(--font-display), Georgia, "Times New Roman", serif',
  },
};
