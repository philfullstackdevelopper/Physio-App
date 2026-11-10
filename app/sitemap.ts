import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  // Date fixe, à avancer quand le contenu de ces pages change vraiment : avec
  // « maintenant » à chaque lecture, les moteurs de recherche voyaient des
  // pages « modifiées » en permanence et finissaient par ignorer la date.
  const now = new Date("2026-11-10");

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.7 },
    { url: `${base}/cgu`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
