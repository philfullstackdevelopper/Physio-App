"use client";

import { useRef } from "react";
import { useInView, AnimatePresence, motion } from "motion/react";
import { Wifi, BatteryFull, Home, ClipboardList, History } from "lucide-react";
import { usePhoneDemo, PhoneDemoBody } from "@/components/PhoneDemoScreens";

// A believable, looping "watch someone use the app" demo — inspired by the
// silent auto-playing product-demo clips on sites like roadtooffer.com.
// EasyPhysio's screens are illustrative mockups, not a real shippable app
// yet, so instead of screen-recorded video, this choreographs the SAME
// mockups (tap → screen change → play → progress) as an animated sequence,
// autoplaying on a loop once the phone scrolls into view. Same choreography
// as the hero phone (PhoneMockup) — see PhoneDemoScreens — just triggered by
// scroll visibility here instead of running immediately.
export default function PhoneShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.5, once: false });
  const { step, stepIndex, reducedMotion } = usePhoneDemo(inView);

  return (
    <div ref={sectionRef} className="flex flex-col items-center py-20 sm:py-28">
      {/* Caption, swaps with the step — fixed-height slot so the phone below
          never shifts or overlaps regardless of title length */}
      <div className="pointer-events-none relative h-[132px] w-full max-w-lg text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 top-0"
          >
            <h2 className="font-display text-2xl font-semibold text-slate-900 sm:text-3xl">
              {step.title}
            </h2>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Phone frame — same chrome as PhoneMockup */}
      <div className="relative mt-6">
        <div className="absolute inset-x-6 top-10 -z-10 h-[480px] rounded-full bg-blue-600/10 blur-[80px]" />
        <div className="relative w-[260px] rounded-[2.75rem] border-[6px] border-slate-900 bg-slate-900 p-1.5 shadow-2xl shadow-blue-900/10">
          <span className="absolute -left-[8px] top-24 h-8 w-1.5 rounded-l-full bg-slate-900" />
          <span className="absolute -left-[8px] top-36 h-12 w-1.5 rounded-l-full bg-slate-900" />
          <span className="absolute -right-[8px] top-32 h-16 w-1.5 rounded-r-full bg-slate-900" />

          <div className="relative h-[540px] overflow-hidden rounded-[2.25rem] bg-white">
            <div className="absolute left-1/2 top-2.5 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-slate-900" />

            <div className="flex items-center justify-between px-6 pt-4 text-[11px] font-semibold text-slate-900">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <Wifi className="h-3 w-3" strokeWidth={2.5} />
                <BatteryFull className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
            </div>

            <PhoneDemoBody step={step} stepIndex={stepIndex} reducedMotion={reducedMotion} />

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-slate-100 bg-white/95 py-3 backdrop-blur">
              <Home className={`h-4 w-4 ${step.screen === 0 ? "text-blue-600" : "text-slate-300"}`} strokeWidth={2} />
              <ClipboardList className={`h-4 w-4 ${step.screen === 1 ? "text-blue-600" : "text-slate-300"}`} strokeWidth={1.75} />
              <History className={`h-4 w-4 ${step.screen === 2 ? "text-blue-600" : "text-slate-300"}`} strokeWidth={1.75} />
            </div>
          </div>
        </div>
      </div>

      {/* Screen-progress dot rail */}
      <div className="mt-8 flex items-center gap-2.5">
        {[0, 1, 2].map((s) => (
          <span
            key={s}
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${step.screen === s ? "bg-blue-600" : "bg-slate-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
