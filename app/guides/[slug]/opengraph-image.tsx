import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { GUIDES, findGuide } from "@/lib/content/guides";
import { guideText } from "@/lib/content/guideText";

// Image d'aperçu propre à chaque guide (LinkedIn, WhatsApp, Google…) : le
// titre du guide plutôt que l'image générale du site, pour qu'un lien partagé
// dise tout de suite de quoi parle l'article (SEO, 2026-11-25). En français,
// comme l'image du site (les robots n'ont pas de cookie de langue).
export const alt = "Guide EasyPhysio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

const logoSrc = `data:image/png;base64,${await readFile(join(process.cwd(), "public/app-icons/icon-512.png"), "base64")}`;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = findGuide(slug);
  const title = guide ? guideText(guide, "fr").title : "Guides EasyPhysio";
  const audience = guide?.audience === "patient" ? "Guide pour les patients" : "Guide pour les kinés";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #f6f8fd 0%, #e8efff 100%)",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={logoSrc} width={72} height={72} style={{ borderRadius: 16 }} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: "#0f172a", letterSpacing: -1 }}>EasyPhysio</div>
            <div style={{ fontSize: 22, color: "#155dfc", fontWeight: 600 }}>easyphysio.fr/guides</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, color: "#155dfc", fontWeight: 600 }}>{audience}</div>
          <div style={{ fontSize: 60, fontWeight: 700, color: "#0f172a", lineHeight: 1.1, letterSpacing: -1.5, marginTop: 14 }}>
            {title}
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#475569" }}>Gratuit pour le kiné · Données hébergées en France (HDS)</div>
      </div>
    ),
    size,
  );
}
