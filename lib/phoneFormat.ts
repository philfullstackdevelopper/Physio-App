// Format téléphone ou format ordinateur ? UNE seule règle, partagée par le CSS
// (variantes `sm:` et `max-sm:` redéfinies dans app/globals.css) et par le
// JavaScript (ce fichier). Les deux doivent rester identiques.
//
// Règle (Philippe, 2026-10-10 : « when you put the app on half a screen, it
// defaults to the phone format — this can't happen ») : le format téléphone
// est réservé aux écrans TACTILES de moins de 640 px de large. Un ordinateur
// (souris ou pavé tactile) garde le format ordinateur même dans une fenêtre
// étroite — une moitié d'écran fait ~631 px chez Philippe. Seule exception :
// une fenêtre d'ordinateur de moins de 480 px, où le format ordinateur (barre
// latérale + contenu) ne tient physiquement plus.
export const PHONE_FORMAT_QUERY =
  "(width < 30rem), (width < 40rem) and (hover: none), (width < 40rem) and (pointer: coarse), (width < 40rem) and (pointer: none)";

/** À appeler côté navigateur uniquement (effets, gestionnaires d'événements). */
export function isPhoneFormat(): boolean {
  return window.matchMedia(PHONE_FORMAT_QUERY).matches;
}
