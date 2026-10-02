"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Réduit son contenu (taille naturelle fixe `width` × `height`, en px) pour
 * qu'il tienne entier dans la place que lui laisse la mise en page — jamais
 * agrandi au-delà de 100 %. Sert au téléphone du hero de la landing : il doit
 * être visible en entier dès l'arrivée, quelle que soit la hauteur de l'écran
 * (Philippe, 2026-09-29).
 *
 * Le contenu est en position absolue : c'est la mise en page autour (hauteur
 * de la section, colonne de grille, flex-1…) qui décide de la place, jamais
 * le contenu lui-même — sinon la mesure tournerait en rond.
 */
export default function FitToBox({
  width,
  height,
  minScale = 0.4,
  className = "",
  children,
}: {
  width: number;
  height: number;
  minScale?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => {
      const { width: w, height: h } = box.getBoundingClientRect();
      if (w === 0 || h === 0) return;
      setScale(Math.max(minScale, Math.min(1, w / width, h / height)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [width, height, minScale]);

  return (
    <div ref={boxRef} className={`relative ${className}`} style={{ minHeight: height * minScale }}>
      <div
        className="absolute inset-0 flex items-center justify-center"
        // Caché tant que la taille n'est pas calculée : évite un flash du
        // téléphone en grand avant sa réduction.
        style={{ visibility: scale === null ? "hidden" : "visible" }}
      >
        <div style={{ zoom: scale ?? 1 }}>{children}</div>
      </div>
    </div>
  );
}
