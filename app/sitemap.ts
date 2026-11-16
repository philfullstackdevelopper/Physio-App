import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { GUIDES } from "@/lib/content/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  // Date fixe, à avancer quand le contenu de ces pages change vraiment : avec
  // « maintenant » à chaque lecture, les moteurs de recherche voyaient des
  // pages « modifiées » en permanence et finissaient par ignorer la date.
  const now = new Date("2026-11-16");

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    // Guides publics (lib/content/guides.ts) : date de leur dernière mise à jour.
    ...GUIDES.map((g) => ({
      url: `${base}/guides/${g.slug}`,
      lastModified: new Date(g.updated),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${base}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/cgu`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
