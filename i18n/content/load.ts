// Traductions du contenu de la plateforme stocké en base (voir
// lib/i18n/dbContent.ts). Chargé à la demande (import dynamique), pour ne pas
// alourdir les pages de ceux qui n'en ont pas besoin.
import en from "./en.json" with { type: "json" };

export const CONTENT: Record<string, Record<string, string>> = { en };
