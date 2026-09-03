import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name}, ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "#f6f8fd",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#155dfc",
              borderRadius: 16,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
              <rect x="7" y="18" width="4.5" height="7" rx="2.25" fill="#ffffff" />
              <rect x="13.75" y="12" width="4.5" height="13" rx="2.25" fill="#ffffff" />
              <rect x="20.5" y="6" width="4.5" height="19" rx="2.25" fill="#ffffff" />
            </svg>
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: "#0f172a" }}>
            {siteConfig.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.15,
              maxWidth: 900,
            }}
          >
            Votre rééducation continue entre deux séances.
          </div>
          <div style={{ fontSize: 30, color: "#475569", marginTop: 24, maxWidth: 860 }}>
            Programmes sur mesure de votre kiné, séances guidées en vidéo, suivi partagé.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#155dfc",
            borderRadius: 9999,
            padding: "14px 32px",
            color: "#ffffff",
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          Créer un compte praticien
        </div>
      </div>
    ),
    { ...size }
  );
}
