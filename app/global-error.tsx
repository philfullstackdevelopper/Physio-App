"use client"; // Les pages d'erreur doivent être des composants client (Next.js).

import { useEffect } from "react";

// Dernier filet (audit du 2026-11-10, A3) : erreur dans le cadre racine
// lui-même (app/layout.tsx). Cette page REMPLACE le cadre racine : elle porte
// ses propres <html> et <body>, sans les styles du site ni les traductions
// (pas de fournisseur next-intl ici) — d'où les styles en ligne et le texte en
// français + anglais écrit en dur. Couleurs = jetons de app/globals.css.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          background: "#f5f7fb",
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <title>EasyPhysio</title>
        <div
          style={{
            width: "100%",
            maxWidth: 384,
            boxSizing: "border-box",
            padding: 32,
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #e5e9f0",
            borderRadius: 24,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Une erreur est survenue</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: "#64748b" }}>
            Rien n&apos;est perdu. Réessayez dans un instant.
          </p>
          <p lang="en" style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.6, color: "#64748b" }}>
            Something went wrong. Nothing is lost — please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "12px 16px",
              fontSize: 16,
              fontWeight: 500,
              color: "#ffffff",
              background: "#155dfc",
              border: 0,
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            Réessayer · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
