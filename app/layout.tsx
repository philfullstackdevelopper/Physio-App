import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { easyPhysioEN, easyPhysioFR } from "@/lib/clerk/localization";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import CookieBanner from "@/components/CookieBanner";
import type { Locale } from "@/i18n/locales";
import { siteConfig } from "@/lib/site";
import AppBridge from "@/components/AppBridge";
import { appStoreId } from "@/lib/app/storeLinks";
import "./globals.css";

// Bannière Safari « Ouvrir dans l'App Store » sur iPhone, une fois l'appli
// publiée (APP_STORE_URL, lib/app/storeLinks.ts).
const iosAppId = appStoreId();

// A distinctive humanist sans instead of the ubiquitous default-template
// font — keeps the UI from reading as a generic scaffolded app.
const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Police du logo « EasyPhysio » (maquette d'identité visuelle, 2026-10-07) :
// le mot est écrit en vraie police, pas en image, pour rester net partout.
const brandFont = Plus_Jakarta_Sans({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["500", "800"],
});

// Pack de textes Clerk (connexion, création de compte) pour chaque langue.
const CLERK_LOCALIZATION = { fr: easyPhysioFR, en: easyPhysioEN } satisfies Record<Locale, unknown>;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("common.site");
  const tagline = t("tagline");
  const description = t("description");
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name}, ${t("titleSuffix")}`,
      template: `%s · ${siteConfig.name}`,
    },
    description,
    // Adresse de référence de chaque page (« ./ » = la page en cours, sur
    // l'adresse principale du site) : le site répond aussi sur l'adresse
    // technique de Scalingo, et les moteurs de recherche ne doivent retenir
    // que easyphysio.fr (audit du 2026-11-10).
    alternates: { canonical: "./" },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : "fr_FR",
      url: siteConfig.url,
      siteName: siteConfig.name,
      title: `${siteConfig.name} · ${tagline}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteConfig.name} · ${tagline}`,
      description,
    },
    ...(iosAppId ? { itunes: { appId: iosAppId } } : {}),
  };
}

// viewport-fit: cover lets the patient bottom nav (PatientNav) pad itself
// with env(safe-area-inset-bottom) so it clears the iOS home indicator —
// without this, that env() value resolves to 0 and does nothing.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  return (
    <html
      lang={locale}
      className={`${instrumentSans.variable} ${brandFont.variable} h-full antialiased`}
      // Browser extensions (e.g. LanguageTool) add attributes to <html> before React loads.
      suppressHydrationWarning
    >
      {/* Idem sur <body> : Grammarly y ajoute data-gr-ext-installed /
          data-new-gr-c-s-check-loaded. N'agit que sur les attributs de
          <body> lui-même, pas sur ses enfants. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider>
          <ClerkProvider localization={CLERK_LOCALIZATION[locale] ?? easyPhysioFR}>
            {children}
            {/* Appli mobile : notifications (ne fait rien dans un navigateur). */}
            <AppBridge />
          </ClerkProvider>
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
