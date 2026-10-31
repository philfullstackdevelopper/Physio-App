"use client";

import { useEffect, useRef } from "react";

// Courte vidéo muette en boucle pour la landing (exécutions filmées avec
// Jules, extraits dans public/videos-demo/). Ne se charge et ne joue que
// lorsqu'elle est à l'écran ; avec « réduire les animations », seule l'image
// fixe (poster) s'affiche.
export default function LoopVideo({ src, poster, className, label }: { src: string; poster: string; className?: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
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
