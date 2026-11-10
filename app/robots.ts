import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/patient",
        "/api",
        "/auth",
        "/prototypes",
        // Pages techniques ou personnelles (audit du 2026-11-10).
        "/documents",
        "/rejoindre",
        "/invitation",
        "/apres-connexion",
        "/connection-error",
        "/signup/finalize",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
