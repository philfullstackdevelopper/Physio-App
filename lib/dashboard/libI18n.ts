// Langue des calculs de lib/dashboard et lib/format (LibI18n, défini dans
// lib/format/relativeDay.ts) — côté serveur : pages et Server Actions du
// tableau de bord. Côté client : lib/dashboard/useLibI18n.ts.

import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import type { LibI18n, Tr } from "@/lib/format/relativeDay";

export async function getLibI18n(): Promise<LibI18n> {
  const [locale, t, tx] = await Promise.all([getLocale(), getTranslations("dashboard.lib"), getTranslations("exercise")]);
  return { locale: locale as Locale, t: t as unknown as Tr, tx: tx as unknown as Tr };
}
