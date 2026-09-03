"use client";

import { useRef, useState } from "react";
import { useInView, AnimatePresence, motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { useKineDemo, KineDemoBody, Cursor } from "@/components/KineDemoScreens";

// The kiné-side counterpart to the hero phone's patient demo: the same
// "watch someone use it" idea, applied to the practitioner's own interface.
// Two same-size screens, autoplaying once scrolled into view, looping — a
// visible cursor drives every step: click a patient on the roster, land on
// their fiche (calendar + recommended séance side by side), click "Ajuster",
// and the exercise picker (same idea as /dashboard/exercices) opens in place
// of the séance card. See KineDemoScreens for the full choreography.
export default function KineDemoMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });
  const { phase, reducedMotion } = useKineDemo(inView);

  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  const [adjustEl, setAdjustEl] = useState<HTMLButtonElement | null>(null);

  const targetEl =
    phase.cursorTarget === "patient-row" ? rowEl : phase.cursorTarget === "adjust-button" ? adjustEl : null;

  return (
    <div ref={ref} className="flex flex-col items-center">
      {/* Caption, swaps with the phase */}
      <div className="pointer-events-none relative h-[56px] w-full max-w-md text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase.badge}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 top-0"
          >
            <span className="inline-flex items-center rounded-full border border-blue-100 bg-white px-4 py-1.5 text-xs font-medium text-blue-700 shadow-sm">
              {phase.badge}
            </span>
            <p className="mt-2 text-sm font-medium text-slate-600">{phase.title}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative mx-auto mt-4 w-full max-w-md" aria-hidden>
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-xl shadow-blue-900/5">
          {/* Browser chrome */}
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            </span>
            <span className="flex-1 truncate rounded-full bg-white px-3 py-1 text-center text-[10px] text-slate-400">
              app.easyphysio.fr/cabinet
            </span>
          </div>

          {/* Fixed-size stage — both screens occupy the exact same box, so
              switching between them never changes the mockup's size. */}
          <div ref={setStageEl} className="relative h-[480px]">
            <KineDemoBody
              screen={phase.screen}
              tab={phase.tab}
              rowHighlight={!reducedMotion && phase.rowHighlight}
              adjustHighlight={!reducedMotion && phase.adjustHighlight}
              registerRowRef={setRowEl}
              registerAdjustRef={setAdjustEl}
            />
            {!reducedMotion && (
              <Cursor stageEl={stageEl} targetEl={targetEl} clicking={phase.clicking} />
            )}
          </div>
        </div>

        {/* Floating confirmation — appears once the new exercises are shown */}
        <AnimatePresence>
          {phase.confirmCallout && !reducedMotion && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -right-4 -top-4 hidden rotate-2 items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-md sm:flex"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
              <span className="whitespace-nowrap text-xs font-semibold text-slate-700">
                Programme ajusté en 2 clics
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Screen-progress dot rail */}
      <div className="mt-6 flex items-center gap-2.5">
        {[0, 1].map((s) => (
          <span
            key={s}
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${phase.screen === s ? "bg-blue-600" : "bg-slate-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
