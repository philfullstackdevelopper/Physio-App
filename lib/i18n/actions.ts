"use server";

import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, LOCALE_GUESSED_COOKIE, isLocale } from "@/i18n/locales";
import { setUserLocale } from "@/lib/db/locale";

// Changer de langue : met à jour le cookie (effet immédiat sur cet
// appareil) et, si la personne est connectée, sa fiche (le choix la suit sur
// ses autres appareils). Appelée par components/LanguageSwitcher.tsx.
export async function changeLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  // Choix explicite : ce n'est plus une langue devinée.
  (await cookies()).delete(LOCALE_GUESSED_COOKIE);
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const { userId } = await auth();
  if (userId) {
    try {
      await setUserLocale(userId, locale);
    } catch (e) {
      // Migration 0084 pas encore appliquée, ou base injoignable : le cookie
      // suffit pour cet appareil, on ne bloque pas le changement.
      console.error("changeLocale : langue non enregistrée en base", e);
    }
  }
  revalidatePath("/", "layout");
}
