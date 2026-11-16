import {
  HIGHEST_PLATFORM_CENTS,
  LOWEST_PLATFORM_CENTS,
  KINE_FOLLOW_UP_CENTS,
  PLATFORM_OFFERS,
  TRIAL_DAYS,
  monthlyTotalCents,
} from "@/lib/billing/patientPlans";
import { SIGNUPS_OPEN } from "@/lib/launchFlags";

// Questions et réponses de la FAQ de l'accueil (messages/<langue>/home.json,
// home.faq). Une seule fonction pour l'affichage (components/FaqSection.tsx)
// et pour les données lues par Google (FAQPage, app/page.tsx) : les deux
// disent toujours la même chose.

type Translate = (key: string, values?: Record<string, string | number>) => string;

export function buildFaq(t: Translate, intlTag: string): { question: string; answer: string }[] {
  const euros = (cents: number) =>
    (cents / 100).toLocaleString(intlTag, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parts = PLATFORM_OFFERS.map((o, i) => {
    const total = euros(monthlyTotalCents(o));
    if (!o.commitmentMonths) return t("offerNoCommitment", { total });
    return i === 1
      ? t("offerCommitmentFirst", { total, months: o.commitmentMonths })
      : t("offerCommitment", { total, months: o.commitmentMonths });
  });
  const offers = t("offersJoin", { head: parts.slice(0, -1).join(", "), last: parts[parts.length - 1] });
  return [
    { question: t("q1"), answer: t("a1") },
    { question: t("q2"), answer: t("a2") },
    { question: t("q3"), answer: t("a3") },
    { question: t("q4"), answer: t("a4") },
    { question: t("q5"), answer: t("a5") },
    {
      question: t("q6"),
      answer: t("a6", {
        trialDays: TRIAL_DAYS,
        offers,
        low: euros(LOWEST_PLATFORM_CENTS),
        high: euros(HIGHEST_PLATFORM_CENTS),
        kine: euros(KINE_FOLLOW_UP_CENTS),
      }),
    },
    {
      question: t("q7"),
      // Avant le lancement (lib/launchFlags.ts), la première phrase annonce la
      // liste d'attente ; la suite décrit ce qui se passera à l'ouverture.
      answer: SIGNUPS_OPEN ? t("a7Open") : t("a7Waitlist"),
    },
  ];
}
