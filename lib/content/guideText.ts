import {
  HIGHEST_PLATFORM_CENTS,
  KINE_FOLLOW_UP_CENTS,
  LOWEST_PLATFORM_CENTS,
  TRIAL_DAYS,
} from "@/lib/billing/patientPlans";
import { intlTag } from "@/lib/i18n/translator";
import type { Guide, GuideLocale, GuideText } from "@/lib/content/guides";

/** Texte d'un guide dans la langue voulue, montants remplis depuis patientPlans. */
export function guideText(guide: Guide, locale: string): GuideText {
  const lang: GuideLocale = locale === "en" ? "en" : "fr";
  const tag = intlTag(lang);
  const euros = (c: number) => (c / 100).toLocaleString(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const values: Record<string, string> = {
    kine: euros(KINE_FOLLOW_UP_CENTS),
    low: euros(LOWEST_PLATFORM_CENTS),
    high: euros(HIGHEST_PLATFORM_CENTS),
    trial: String(TRIAL_DAYS),
  };
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
  const src = guide.text[lang];
  return {
    title: fill(src.title),
    description: fill(src.description),
    sections: src.sections.map((s) => ({
      heading: fill(s.heading),
      paragraphs: s.paragraphs.map(fill),
      bullets: s.bullets?.map(fill),
    })),
  };
}
