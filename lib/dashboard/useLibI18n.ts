// Langue des calculs de lib/dashboard et lib/format, côté composant (client
// ou serveur non-async) — pendant de getLibI18n (lib/dashboard/libI18n.ts).

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/locales";
import type { LibI18n, Tr } from "@/lib/format/relativeDay";

export function useLibI18n(): LibI18n {
  const locale = useLocale() as Locale;
  const t = useTranslations("dashboard.lib");
  const tx = useTranslations("exercise");
  return { locale, t: t as unknown as Tr, tx: tx as unknown as Tr };
}
