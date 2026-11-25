"use client";

import { useRef, useState, type MouseEvent } from "react";
import { useInView } from "motion/react";
import { Wifi, BatteryFull } from "lucide-react";
import { usePhoneDemo, PhoneDemoBody, DemoTabBar } from "@/components/PhoneDemoScreens";

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
  // load. It only pauses when it can't be seen: scrolled away, or hidden on a
  // phone (max-sm:hidden on the home page), where it used to keep cycling —
  // and download the séance video — for nothing (audit vitesse 2026-11-25).
  const inView = useInView(frameRef);
  const { step, stepIndex, reducedMotion } = usePhoneDemo(inView);

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

      {/* Flotte doucement : animation CSS ep-float (app/globals.css). */}
      <div className="animate-[ep-float_7s_ease-in-out_infinite]" style={{ perspective: "900px" }}>
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
          <div className="relative h-[540px] overflow-hidden rounded-[2.25rem] bg-[#f4f7fc]">
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

            {/* Barre d'onglets du vrai téléphone patient (absente pendant la séance). */}
            <DemoTabBar screen={step.screen} />
          </div>
        </div>
      </div>
    </div>
  );
}
