import { siteConfig } from "@/lib/site";
import { KINE_FOLLOW_UP_CENTS, LOWEST_PLATFORM_CENTS, HIGHEST_PLATFORM_CENTS } from "@/lib/billing/patientPlans";

// Données structurées (schema.org, JSON-LD) lues par Google, Bing et les
// assistants IA : qui est EasyPhysio, ce que fait l'appli, combien elle coûte.
// Elles ne s'affichent pas : elles décrivent la page aux moteurs. Tout ce qui
// est écrit ici doit rester VRAI et identique à ce que la page montre (règle
// Google) — aucun avis ni note inventés (Philippe n'a pas encore d'avis réels).

const ORG_ID = `${siteConfig.url}/#organisation`;
const SITE_ID = `${siteConfig.url}/#site`;
const APP_ID = `${siteConfig.url}/#application`;

/** Comptes publics d'EasyPhysio (à compléter quand ils existent : LinkedIn, Instagram…). */
export const SAME_AS: string[] = [
  "https://www.linkedin.com/company/easyphysio-fr/", // créée le 2026-11-16
];

export function organizationLd() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: siteConfig.name,
    alternateName: ["Easy Physio", "Easyphysio", "EasyPhysio.fr"],
    url: siteConfig.url,
    logo: `${siteConfig.url}/app-icons/icon-512.png`,
    description:
      "Application de suivi d'exercices pour les kinésithérapeutes et leurs patients : programmes d'exercices, séances guidées en vidéo et suivi entre deux rendez-vous.",
    email: "contact@easyphysio.fr",
    founder: { "@type": "Person", name: "Philippe Maupain" },
    foundingDate: "2026",
    areaServed: "FR",
    ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
  };
}

export function websiteLd(locale: "fr" | "en") {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    name: siteConfig.name,
    alternateName: ["Easy Physio", "easyphysio.fr"],
    url: `${siteConfig.url}/`,
    inLanguage: locale === "en" ? "en" : "fr-FR",
    publisher: { "@id": ORG_ID },
  };
}

export function applicationLd(description: string) {
  const euros = (c: number) => (c / 100).toFixed(2);
  return {
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: siteConfig.name,
    applicationCategory: "HealthApplication",
    applicationSubCategory: "Rééducation, exercices de kinésithérapie à domicile",
    operatingSystem: "Web, iOS, Android",
    url: siteConfig.url,
    description,
    publisher: { "@id": ORG_ID },
    offers: [
      {
        "@type": "Offer",
        name: "Kinésithérapeute",
        price: "0",
        priceCurrency: "EUR",
        description: "Gratuit pour le kiné, sans abonnement, nombre de patients illimité.",
      },
      {
        "@type": "AggregateOffer",
        name: "Patient — accès à l'application",
        lowPrice: euros(LOWEST_PLATFORM_CENTS),
        highPrice: euros(HIGHEST_PLATFORM_CENTS),
        priceCurrency: "EUR",
        description: `Abonnement mensuel du patient selon l'engagement, plus ${euros(KINE_FOLLOW_UP_CENTS)} € par mois versés directement à son kiné les mois où il met à jour le programme.`,
      },
    ],
  };
}

export function faqLd(items: { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

export function articleLd(a: { url: string; title: string; description: string; published: string; updated: string; locale: "fr" | "en" }) {
  return {
    "@type": "Article",
    headline: a.title,
    description: a.description,
    url: a.url,
    mainEntityOfPage: a.url,
    datePublished: a.published,
    dateModified: a.updated,
    inLanguage: a.locale === "en" ? "en" : "fr-FR",
    author: { "@type": "Person", name: "Philippe Maupain", worksFor: { "@id": ORG_ID } },
    publisher: { "@id": ORG_ID },
    image: `${siteConfig.url}/opengraph-image`,
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

/** Un seul bloc JSON-LD qui regroupe plusieurs objets. */
export function graph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
