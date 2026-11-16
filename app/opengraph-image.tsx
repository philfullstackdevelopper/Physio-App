import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { siteConfig } from "@/lib/site";

export const alt =
  "EasyPhysio : le suivi des exercices entre deux séances de kiné. Gratuit pour le kinésithérapeute, données hébergées en France (HDS).";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Image d'aperçu des liens partagés et des résultats de recherche (Google,
// LinkedIn, WhatsApp…). Refaite le 2026-11-16 (Philippe : « la présentation
// en ligne n'est pas la meilleure ») : vrai logo EasyPhysio (le coureur, et non
// plus l'ancienne icône en barres), message pour les kinés, et de vrais dessins
// d'exercices de l'appli. Volontairement en français seulement (audit du
// 2026-11-10) : une seule adresse d'image, les robots n'ont pas de cookie de
// langue, et la langue de référence du site est le français.
const logoSrc = `data:image/png;base64,${await readFile(join(process.cwd(), "public/app-icons/icon-512.png"), "base64")}`;
const squatSrc = `data:image/svg+xml;base64,${await readFile(
  join(process.cwd(), "public/exercise-illustrations/bodyweight-squat/anim-4.svg"),
  "base64",
)}`;
const bridgeSrc = `data:image/svg+xml;base64,${await readFile(
  join(process.cwd(), "public/exercise-illustrations/banded-glute-bridge/anim-4.svg"),
  "base64",
)}`;

const CHIPS = ["Gratuit pour le kiné", "Exercices filmés et animés", "Hébergé en France (HDS)"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #f6f8fd 0%, #e8efff 100%)",
          padding: 64,
          gap: 48,
        }}
      >
        {/* Texte */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img src={logoSrc} width={76} height={76} style={{ borderRadius: 18 }} alt="" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 44, fontWeight: 700, color: "#0f172a", letterSpacing: -1 }}>{siteConfig.name}</div>
              <div style={{ fontSize: 24, color: "#155dfc", fontWeight: 600 }}>easyphysio.fr</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 52, fontWeight: 700, color: "#0f172a", lineHeight: 1.12, letterSpacing: -1.5 }}>
              Le suivi des exercices entre deux séances de kiné.
            </div>
            <div style={{ fontSize: 26, color: "#475569", marginTop: 18, lineHeight: 1.35 }}>
              Programmes guidés sur le téléphone du patient, douleur et assiduité suivies par le kiné.
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {CHIPS.map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  background: "#ffffff",
                  border: "2px solid #c7d7fe",
                  color: "#1e3a8a",
                  borderRadius: 9999,
                  padding: "8px 18px",
                  fontSize: 20,
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Aperçu d'une séance dans l'appli */}
        <div
          style={{
            width: 300,
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            borderRadius: 36,
            border: "2px solid #dbe4ff",
            boxShadow: "0 24px 60px rgba(21, 93, 252, 0.18)",
            padding: 24,
            gap: 14,
          }}
        >
          <div style={{ fontSize: 20, color: "#64748b", fontWeight: 600 }}>Séance du jour</div>
          {[
            { src: squatSrc, name: "Squat", dose: "3 × 12" },
            { src: bridgeSrc, name: "Pont", dose: "3 × 10" },
          ].map((ex) => (
            <div
              key={ex.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "#f6f8fd",
                borderRadius: 22,
                padding: 12,
              }}
            >
              <img src={ex.src} width={104} height={104} alt="" />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{ex.name}</div>
                <div style={{ fontSize: 20, color: "#155dfc", fontWeight: 600 }}>{ex.dose}</div>
              </div>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              background: "#155dfc",
              color: "#ffffff",
              borderRadius: 9999,
              padding: "12px 0",
              fontSize: 22,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            Commencer la séance
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
