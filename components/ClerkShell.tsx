import { ClerkProvider } from "@clerk/nextjs";
import { getLocale } from "next-intl/server";
import { easyPhysioEN, easyPhysioFR } from "@/lib/clerk/localization";
import type { Locale } from "@/i18n/locales";
import AppBridge from "@/components/AppBridge";
import WebPushPrompt from "@/components/WebPushPrompt";

// Pack de textes Clerk (connexion, création de compte) pour chaque langue.
const CLERK_LOCALIZATION = { fr: easyPhysioFR, en: easyPhysioEN } satisfies Record<Locale, unknown>;

/**
 * Clerk (connexion) seulement là où on en a besoin (audit vitesse du
 * 2026-11-25). Avant, <ClerkProvider> était dans app/layout.tsx : chaque page
 * publique (accueil, guides, démo, pages légales) téléchargeait et lançait le
 * code de Clerk (~quelques centaines de Ko de JavaScript + la protection
 * anti-robots), ce qui rendait l'accueil très lent sur téléphone.
 *
 * Ce cadre est posé dans le layout de chaque partie qui utilise Clerk :
 * /login, /signup, /invitation, /rejoindre, /cabinet, /apres-connexion,
 * /deconnexion, /dashboard, /patient, /admin, /documents, /connection-error,
 * /prototypes. Les pages publiques savent si la personne est connectée par le
 * serveur (components/SiteHeader.tsx), sans le code de Clerk.
 *
 * Toute nouvelle partie de l'appli qui utilise un composant ou un hook de
 * Clerk (SignIn, SignOutButton, useUser, useAuth…) doit avoir ce cadre dans
 * son layout, sinon la page plante (« must be used within ClerkProvider »).
 */
export default async function ClerkShell({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  return (
    <ClerkProvider localization={CLERK_LOCALIZATION[locale] ?? easyPhysioFR}>
      {children}
      {/* Appli mobile : notifications (ne fait rien dans un navigateur). */}
      <AppBridge />
      {/* Site installé sur l'écran d'accueil : notifications (rien ailleurs). */}
      <WebPushPrompt />
    </ClerkProvider>
  );
}
