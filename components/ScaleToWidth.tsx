"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Affiche son contenu à une largeur fixe `designWidth` (en px) et le réduit,
 * comme une capture d'écran, quand la place disponible est plus étroite —
 * jamais agrandi. Sert à la démo kiné de la landing : sur téléphone, elle doit
 * montrer exactement les mêmes écrans que sur ordinateur (barre latérale,
 * colonnes…), pas une version simplifiée (Philippe, 2026-10-02).
 *
 * Au-delà de `designWidth`, le contenu prend simplement toute la largeur.
 * `stable` garde la plus grande hauteur vue, pour une démo animée dont la
 * hauteur change d'une scène à l'autre (sinon la page sauterait).
 */
export default function ScaleToWidth({
  designWidth,
  stable = false,
  className = "",
  children,
}: {
  designWidth: number;
  stable?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    let maxHeight = 0;
    let lastWidth = 0;

    const update = () => {
      const width = outer.clientWidth;
      if (width === 0) return;
      if (width !== lastWidth) {
        maxHeight = 0;
        lastWidth = width;
      }
      const scale = Math.min(1, width / designWidth);
      const natural = inner.offsetHeight;
      maxHeight = stable ? Math.max(maxHeight, natural) : natural;
      setFit({ scale, height: maxHeight * scale });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [designWidth, stable]);

  const scaled = fit !== null && fit.scale < 1;
  return (
    <div ref={outerRef} className={className} style={scaled ? { height: fit.height } : undefined}>
      <div
        ref={innerRef}
        style={
          scaled
            ? { width: designWidth, transform: `scale(${fit.scale})`, transformOrigin: "top left" }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
