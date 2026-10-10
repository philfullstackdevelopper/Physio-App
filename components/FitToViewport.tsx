"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { isPhoneFormat } from "@/lib/phoneFormat";

// Place prise en haut par le header fixe du site (SiteHeader) + une marge.
const HEADER_SPACE = 88;

/**
 * Réduit son contenu juste assez pour que TOUTE la section qui le contient
 * (titre compris) tienne sur un écran, sous le header — règle de Philippe
 * (2026-09-29) : chaque partie de la landing doit rentrer entière dans la
 * page, sans devoir défiler au milieu. Jamais agrandi au-delà de 100 %.
 *
 * transform: scale (et pas zoom) : offsetHeight reste la taille naturelle,
 * donc la mesure ne tourne pas en rond ; la hauteur du conteneur est
 * ajustée à la main pour que la mise en page suive la réduction.
 *
 * `stable` : garde la plus grande hauteur vue (démo animée dont la hauteur
 * change d'une scène à l'autre — sinon l'échelle sauterait à chaque scène).
 *
 * Désactivé sous 640 px de large : sur téléphone, réduire des tableaux ou
 * des cartes empilées les rendrait illisibles.
 */
export default function FitToViewport({
  children,
  minScale = 0.85,
  stable = false,
  className = "",
}: {
  children: React.ReactNode;
  minScale?: number;
  stable?: boolean;
  className?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; natural: number } | null>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    let maxNatural = 0;

    // Téléphone à l'horizontale (même requête que la variante phone-land de
    // globals.css) : pas de « stable » (sa hauteur maximale peut venir d'un
    // instant où le contenu n'était pas encore réduit) et réduction permise
    // jusqu'à 0,62 pour que chaque section tienne dans ~300 px de haut
    // (Philippe, 2026-10-04). Ordinateur et tablette : inchangés.
    const phoneLand = window.matchMedia(
      "(orientation: landscape) and (max-height: 500px) and (pointer: coarse)",
    ).matches;
    const floor = phoneLand ? Math.min(minScale, 0.62) : minScale;

    const update = () => {
      const natural = inner.offsetHeight;
      if (natural === 0) return;
      maxNatural = stable && !phoneLand ? Math.max(maxNatural, natural) : natural;
      // Démo kiné (stable) à l'horizontale sur téléphone : sa largeur est déjà
      // calculée pour tenir dans l'écran (app/page.tsx, phone-land:max-w) —
      // la réduire une 2e fois la rendait minuscule.
      if (isPhoneFormat() || (phoneLand && stable)) {
        setFit({ scale: 1, natural });
        return;
      }
      // Tout ce que la section contient en dehors de ce bloc (titre,
      // sous-titre, bouton…), à ajouter à la hauteur du bloc lui-même.
      const section = outer.closest("section") ?? outer.parentElement!;
      const others = section.getBoundingClientRect().height - outer.getBoundingClientRect().height;
      const available = window.innerHeight - HEADER_SPACE - others;
      const scale = Math.max(floor, Math.min(1, available / maxNatural));
      setFit({ scale, natural });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(inner);
    const onResize = () => {
      maxNatural = 0;
      update();
    };
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [minScale, stable]);

  const scale = fit?.scale ?? 1;
  return (
    <div
      ref={outerRef}
      className={className}
      style={fit && scale < 1 ? { height: fit.natural * scale } : undefined}
    >
      <div
        ref={innerRef}
        style={scale < 1 ? { transform: `scale(${scale})`, transformOrigin: "top center" } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
