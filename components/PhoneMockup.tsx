"use client";

import { useRef, useState, type MouseEvent } from "react";
import { motion } from "motion/react";
import { Wifi, BatteryFull, Home, ClipboardList, History } from "lucide-react";
import { usePhoneDemo, PhoneDemoBody } from "@/components/PhoneDemoScreens";

// Resting 3D tilt when the cursor isn't over the phone — angled, not flat,
// per the floating-device-mockup convention.
const REST_TILT = { x: 8, y: -16 };

/**
 * Illustrative device-frame mockup of the patient app screen — built in CSS,
 * not a real product screenshot (no live UI to capture yet). Slowly floats,
 * and tilts in 3D toward the cursor on hover.
 */
export default function PhoneMockup() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState(REST_TILT);
  // Autoplays immediately — the hero phone is above the fold, visible on
  // load, so "on page load" just means "always active" here (PhoneShowcase
  // uses the same demo but gates it on scroll visibility instead).
  const { step, stepIndex, reducedMotion } = usePhoneDemo(true);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (0.5 - py) * 26, y: (px - 0.5) * 34 });
  }

  return (
    <div className="relative mx-auto w-[260px]" aria-hidden>
      {/* Ambient glow — reads as the device floating above the page. */}
      <div className="absolute inset-x-6 top-10 -z-10 h-[480px] rounded-full bg-blue-600/10 blur-[80px]" />

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{ perspective: "900px" }}
      >
        {/* Device frame */}
        <div
          ref={frameRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTilt(REST_TILT)}
          className="relative rounded-[2.75rem] border-[6px] border-slate-900 bg-slate-900 p-1.5 shadow-2xl shadow-blue-900/10 transition-transform duration-300 ease-out will-change-transform"
          style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
        >
          <span className="absolute -left-[8px] top-24 h-8 w-1.5 rounded-l-full bg-slate-900" />
          <span className="absolute -left-[8px] top-36 h-12 w-1.5 rounded-l-full bg-slate-900" />
          <span className="absolute -right-[8px] top-32 h-16 w-1.5 rounded-r-full bg-slate-900" />

          {/* Screen */}
          <div className="relative h-[540px] overflow-hidden rounded-[2.25rem] bg-white">
            <div className="absolute left-1/2 top-2.5 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-slate-900" />

            {/* Status bar */}
            <div className="flex items-center justify-between px-6 pt-4 text-[11px] font-semibold text-slate-900">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <Wifi className="h-3 w-3" strokeWidth={2.5} />
                <BatteryFull className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
            </div>

            {/* App content — cycles automatically: dashboard → start an
                exercise → progress, then loops. Same choreography as
                PhoneShowcase further down the page. */}
            <PhoneDemoBody step={step} stepIndex={stepIndex} reducedMotion={reducedMotion} />

            {/* Bottom nav — mirrors the real patient app's 3 tabs */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-slate-100 bg-white/95 py-3 backdrop-blur">
              <Home className={`h-4 w-4 ${step.screen === 0 ? "text-blue-600" : "text-slate-300"}`} strokeWidth={2} />
              <ClipboardList className={`h-4 w-4 ${step.screen === 1 ? "text-blue-600" : "text-slate-300"}`} strokeWidth={1.75} />
              <History className={`h-4 w-4 ${step.screen === 2 ? "text-blue-600" : "text-slate-300"}`} strokeWidth={1.75} />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
