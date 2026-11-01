"use client";

import { useEffect, useRef } from "react";

// Courte vidéo muette en boucle pour la landing (exécutions filmées avec
// Jules, extraits dans public/videos-demo/). Ne se charge et ne joue que
// lorsqu'elle est à l'écran ; avec « réduire les animations », seule l'image
// fixe (poster) s'affiche.
//
// Téléphone (2026-11-01, Philippe : « elles ne jouent pas ») : un téléphone ne
// lance seule qu'une vidéo MUETTE. React n'écrit pas l'attribut `muted` dans
// la page rendue par le serveur : on le force ici avant de lancer la lecture.
// Si le téléphone refuse quand même (mode économie d'énergie de l'iPhone), la
// vidéo repart au premier toucher de l'écran.
// Dans un bandeau qui défile (data-loop-group), on surveille le bandeau
// entier : toutes ses vidéos tournent dès qu'il est à l'écran, sinon chacune
// ne commençait à charger qu'en entrant et passait en image fixe.
export default function LoopVideo({ src, poster, className, label }: { src: string; poster: string; className?: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");

    let visible = false;
    let waitingForTouch = false;
    const retry = () => {
      waitingForTouch = false;
      if (visible) v.play().catch(() => {});
    };
    const tryPlay = () => {
      v.play().catch(() => {
        if (waitingForTouch) return;
        waitingForTouch = true;
        document.addEventListener("touchend", retry, { once: true, passive: true });
        document.addEventListener("pointerdown", retry, { once: true, passive: true });
      });
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) tryPlay();
        else v.pause();
      },
      { threshold: 0 },
    );
    io.observe(v.closest("[data-loop-group]") ?? v);
    return () => {
      io.disconnect();
      document.removeEventListener("touchend", retry);
      document.removeEventListener("pointerdown", retry);
    };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      className={className}
    />
  );
}
