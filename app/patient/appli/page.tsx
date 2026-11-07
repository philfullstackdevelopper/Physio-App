import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Smartphone } from "lucide-react";
import { nativeAppPlatform } from "@/lib/app/nativeAppServer";
import { phoneFromUserAgent, storeLinks } from "@/lib/app/storeLinks";

export const metadata = { title: "Téléchargez l'appli" };

// Dernier écran de l'inscription sur le site (après le profil) : propose
// l'appli. Inscription et paiement se font sur le site, jamais dans l'appli
// (règles d'Apple) ; ensuite le patient s'y connecte avec le même compte.
// Sans adresse de magasin (lib/app/storeLinks.ts), ou déjà dans l'appli :
// directement le programme.
export default async function PatientAppPage() {
  if (await nativeAppPlatform()) redirect("/patient");
  const links = storeLinks();
  if (!links.ios && !links.android) redirect("/patient");

  const phone = phoneFromUserAgent((await headers()).get("user-agent"));
  const showIos = links.ios && phone !== "android";
  const showAndroid = links.android && phone !== "ios";
  if (!showIos && !showAndroid) redirect("/patient");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-app-bg p-6 max-sm:min-h-[calc(100dvh-var(--phone-chrome))]">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-soft">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Smartphone className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-ink">Votre programme est prêt</h1>
        <p className="mt-2 text-sm text-muted">
          Installez l&apos;appli EasyPhysio pour recevoir les messages de votre kiné et le rappel de votre séance. Connectez-vous avec
          le même e-mail et le même mot de passe.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {showIos && (
            <a href={links.ios!} className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              Télécharger dans l&apos;App Store
            </a>
          )}
          {showAndroid && (
            <a href={links.android!} className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              Télécharger sur Google Play
            </a>
          )}
          <Link href="/patient" className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-app-bg">
            Continuer dans le navigateur
          </Link>
        </div>
      </div>
    </main>
  );
}
