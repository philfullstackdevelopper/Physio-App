"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MousePointer2 } from "lucide-react";

// A small pointer that travels to whichever element registered itself under
// `target`, measured against `stageEl` — no hardcoded coordinates, so it
// always lands exactly on the real button/row regardless of text length.
export function Cursor({
  stageEl,
  targetEl,
  clicking,
}: {
  stageEl: HTMLElement | null;
  targetEl: HTMLElement | null;
  clicking: boolean;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!stageEl || !targetEl) {
      setPos(null);
      return;
    }
    const stageRect = stageEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    setPos({
      x: ((targetRect.left + targetRect.width / 2 - stageRect.left) / stageRect.width) * 100,
      y: ((targetRect.top + targetRect.height / 2 - stageRect.top) / stageRect.height) * 100,
    });
  }, [stageEl, targetEl]);

  return (
    <AnimatePresence>
      {pos && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, left: `${pos.x}%`, top: `${pos.y}%` }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.2 },
            left: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
            top: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
          }}
          className="pointer-events-none absolute z-30"
        >
          <MousePointer2 className="h-4 w-4 -translate-x-1 -translate-y-1 fill-slate-900 text-slate-900 drop-shadow-md" strokeWidth={1.5} />
          <AnimatePresence>
            {clicking && (
              <motion.span
                initial={{ opacity: 0.45, scale: 0.3 }}
                animate={{ opacity: 0, scale: 2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute left-0 top-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500"
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
