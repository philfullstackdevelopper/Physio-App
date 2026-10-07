"use client";

import { useLayoutEffect, useRef, useState } from "react";
import PainHistoryChart from "@/components/PainHistoryChart";
import type { PainSeries } from "@/lib/dashboard/painHistory";

/**
 * « Mes progrès » sur téléphone : la courbe prend toute la hauteur libre
 * jusqu'à la barre d'onglets (Philippe, 2026-10-04 : « que TOUT l'espace soit
 * utilisé »). Mesure sa boîte (flex-1) et dessine la courbe avec le même
 * rapport largeur/hauteur, pour que texte et points ne soient pas étirés.
 * Dès 640 px : la courbe habituelle, inchangée.
 */
export default function FillPainChart({ series }: { series: PainSeries }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [viewHeight, setViewHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => {
      const { width, height } = box.getBoundingClientRect();
      if (!mq.matches || width === 0 || height === 0) return setViewHeight(null);
      // viewBox de 320 de large : hauteur proportionnelle à la boîte.
      setViewHeight(Math.max(120, Math.round((height / width) * 320)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    mq.addEventListener("change", update);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

  return (
    <div ref={boxRef} className="relative max-sm:min-h-16 max-sm:flex-1">
      {viewHeight === null ? (
        <PainHistoryChart series={series} />
      ) : (
        <div className="absolute inset-0">
          <PainHistoryChart series={series} height={viewHeight} className="h-full w-full" />
        </div>
      )}
    </div>
  );
}
