"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fades a section up into place the first time it scrolls into view.
 *  `delay` staggers siblings; it never re-triggers on scroll-back.
 *
 *  Même mouvement qu'avant (0,6 s, monte de 24 px, déclenché 80 px après
 *  l'entrée à l'écran), mais en CSS au lieu de la bibliothèque motion : les
 *  guides et les pages qui n'utilisent que ce composant ne la chargent plus
 *  (audit vitesse du 2026-11-25). */
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "-80px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(24px)",
        transition: `opacity 0.6s ${EASE} ${delay}s, transform 0.6s ${EASE} ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
