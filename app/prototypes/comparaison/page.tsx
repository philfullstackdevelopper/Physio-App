"use client";

// Prototype surface — ROUND 2 for "Comparaison" (Pourquoi pas juste du
// papier ?). Round 1 (text-arranged directions: before/after, stat
// callouts, grouped-by-moment) was rejected as too generic and not
// interactive/illustrated enough. This round leans on real interaction
// (drag, click, live state) and the app's own animated exercise
// illustrations (components/ExerciseIllustration.tsx — real vendored
// Everkinetic SVGs already used in the product) instead of icon-and-text
// layout tricks. Not linked from production nav. Delete this route once a
// direction is promoted into components/ComparisonTable.tsx.

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { FileText, ChevronsLeftRight } from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";

const VARIANT_NAMES = ["Drag to compare", "Flip cards", "Live simulation"];

const PICKER_CSS = `
.proto-picker {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.82);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 8px 24px rgba(0, 0, 0, 0.24),
    0 2px 6px rgba(0, 0, 0, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  user-select: none;
  -webkit-user-select: none;
}
.proto-picker-highlight {
  position: absolute;
  top: 4px;
  left: 0;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  will-change: transform;
}
.proto-picker[data-ready] .proto-picker-highlight {
  transition: transform 250ms cubic-bezier(0.23, 1, 0.32, 1), width 250ms cubic-bezier(0.23, 1, 0.32, 1);
}
@media (prefers-reduced-motion: reduce) {
  .proto-picker[data-ready] .proto-picker-highlight { transition: none; }
}
.proto-picker-item {
  position: relative;
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font: inherit;
  cursor: pointer;
  transition: color 150ms ease-out;
}
.proto-picker-item:hover { color: rgba(255, 255, 255, 0.85); }
.proto-picker-item:active { transform: scale(0.97); }
.proto-picker-item:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.4); outline-offset: 2px; }
.proto-picker-item[data-active] { color: #fff; }
`;

type CellValue = string | { check: true };

const ROWS: { label: string; paper: CellValue; sms: CellValue; app: CellValue }[] = [
  {
    label: "Démonstration de l'exercice",
    paper: "Schémas sur une feuille",
    sms: "—",
    app: "Vidéo + consignes à l'écran",
  },
  {
    label: "Suivi entre deux rendez-vous",
    paper: "Rien entre les consultations",
    sms: "« Vu / pas vu »",
    app: "Séance par séance : durée et ressenti",
  },
  {
    label: "Signalement d'une douleur",
    paper: "Au prochain rendez-vous (souvent 4 à 6 semaines)",
    sms: "Non prévu",
    app: "Le jour même, remontée au praticien",
  },
  {
    label: "Ajustement du programme",
    paper: "À la consultation suivante",
    sms: "Jamais",
    app: "Après chaque séance signalée difficile",
  },
  {
    label: "Coût pour le patient",
    paper: { check: true },
    sms: "Variable selon l'opérateur",
    app: { check: true },
  },
];

function val(v: CellValue): string {
  return typeof v === "object" ? "Gratuit" : v;
}

function SectionHeader() {
  return (
    <>
      <h2 className="font-display max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
        Ce qui change vraiment pour le patient
      </h2>
    </>
  );
}

// Axis: direct manipulation — a real before/after drag slider (à la photo
// comparison tools). Papier is the base layer; dragging peels it back to
// reveal EasyPhysio's real, animated exercise illustration underneath.
// Native <input type="range"> stretched over the visual, invisible, driving
// a clip-path — reliable dragging without hand-rolled pointer-capture code.
function ComparisonSlider() {
  const [pos, setPos] = useState(50);

  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <SectionHeader />

      <div className="relative mt-14 aspect-[4/3] select-none overflow-hidden rounded-3xl border border-slate-200 shadow-sm sm:aspect-[16/9]">
        {/* Base (Papier) layer fills the whole box; its content is pinned to
            the LEFT quarter with a fixed offset — not centered on the full
            width — so it never collides with the EasyPhysio content, which
            is pinned to the right quarter. Only the clip-path on the
            EasyPhysio layer moves as the handle drags. */}
        <div className="absolute inset-0 bg-slate-50" />
        <div className="absolute left-[8%] top-1/2 w-[42%] -translate-y-1/2 text-center">
          <FileText className="mx-auto h-16 w-16 text-slate-300" strokeWidth={1.25} />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Papier</p>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Schémas sur une feuille, rien entre deux rendez-vous
          </p>
        </div>

        {/* One full-size wrapper carries the clip-path, so its percentage is
            relative to the same box the drag-handle line is positioned
            against — a clip-path on the differently-sized text container
            alone would clip against ITS OWN width, not the handle's
            position, and drift out of sync with it. */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <div className="absolute inset-0 bg-blue-50/70" />
          <div className="absolute right-[8%] top-1/2 w-[42%] -translate-y-1/2 text-center">
            <ExerciseIllustration name="Squat" className="mx-auto h-20 w-20 text-blue-600" animate />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-500">EasyPhysio</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              Vidéo animée, suivi séance par séance
            </p>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white"
          style={{ left: `${pos}%`, boxShadow: "0 0 0 1px rgba(15,23,42,0.08)" }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md">
            <ChevronsLeftRight className="h-4 w-4 text-slate-500" strokeWidth={2} />
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          aria-label="Faites glisser pour comparer papier et EasyPhysio"
        />
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">Faites glisser pour comparer →</p>

      <ul className="mt-12 divide-y divide-slate-200 border-t border-slate-200">
        {ROWS.map((row) => (
          <li key={row.label} className="flex flex-wrap items-baseline justify-between gap-2 py-4 text-sm">
            <span className="font-medium text-slate-900">{row.label}</span>
            <span className="text-slate-500">
              {val(row.paper)} <span className="text-slate-300">→</span>{" "}
              <span className="font-medium text-blue-700">{val(row.app)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Real vendored illustrations to cycle through, one per card — variety
// instead of repeating the same movement five times.
const CARD_ILLUSTRATIONS = ["Squat", "Pont fessier", "Chat-vache", "Squat", "Pont fessier"];

// Axis: click interaction — five cards, each a real 3D flip (spring, no
// overshoot, per apple-design's "critically damped by default" rule) from a
// muted "Papier" face to an illustrated "EasyPhysio" face.
function ComparisonFlipCards() {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <SectionHeader />
      <p className="mt-3 text-sm text-slate-500">Touchez une carte pour voir ce qui change.</p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ROWS.map((row, i) => {
          const isFlipped = flipped.has(i);
          return (
            <button
              key={row.label}
              type="button"
              onClick={() => toggle(i)}
              className="text-left active:scale-[0.98]"
              style={{ perspective: 1000 }}
              aria-pressed={isFlipped}
            >
              <motion.div
                className="relative h-56 w-full"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              >
                <div
                  className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Papier</p>
                    <p className="font-display mt-2 text-base font-semibold text-slate-900">{row.label}</p>
                    <p className="mt-2 text-sm text-slate-500">{val(row.paper)}</p>
                  </div>
                  <p className="text-xs font-medium text-blue-600">Touchez pour voir →</p>
                </div>

                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-blue-600 bg-blue-50/60 p-5 text-center"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <ExerciseIllustration
                    name={CARD_ILLUSTRATIONS[i]}
                    className="h-14 w-14 text-blue-600"
                    animate={isFlipped}
                  />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-500">EasyPhysio</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{val(row.app)}</p>
                  </div>
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Axis: lived interaction — instead of describing the douleur-signalée row,
// let the visitor trigger it. A mode toggle switches the "world" (papier vs
// EasyPhysio); the same button click either does nothing (papier — the
// point IS the silence) or fires a real notification toast (EasyPhysio).
function ComparisonSimulation() {
  const [mode, setMode] = useState<"papier" | "app">("papier");
  const [clicked, setClicked] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleClick = () => {
    setClicked(true);
    if (mode === "app") {
      setShowToast(true);
      window.setTimeout(() => setShowToast(false), 2600);
    }
  };

  const otherRows = ROWS.filter((r) => r.label !== "Signalement d'une douleur");

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <SectionHeader />

      <div className="mx-auto mt-8 inline-flex rounded-full bg-slate-100 p-1">
        {(["papier", "app"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setClicked(false);
              setShowToast(false);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {m === "papier" ? "Avec une feuille" : "Avec EasyPhysio"}
          </button>
        ))}
      </div>

      <div className="relative mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white p-10">
        {showToast && (
          <div className="animate-[fadeInUp_0.3s_ease-out_both] absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-medium text-blue-700 shadow-lg">
            ✓ Douleur signalée · reçue par Julien, kiné
          </div>
        )}

        <ExerciseIllustration name="Squat" className="mx-auto h-20 w-20 text-blue-600" animate={mode === "app"} />
        <p className="mt-4 text-sm text-slate-500">Une douleur pendant l&apos;exercice ?</p>
        <button
          type="button"
          onClick={handleClick}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.97]"
        >
          Signaler une douleur
        </button>

        {clicked && mode === "papier" && (
          <p className="animate-[fadeInUp_0.4s_ease-out_both] mt-4 text-sm text-slate-400">
            … rien ne se passe avant le prochain rendez-vous (souvent 4 à 6 semaines).
          </p>
        )}
        {clicked && mode === "app" && (
          <p className="animate-[fadeInUp_0.4s_ease-out_both] mt-4 text-sm text-slate-500">
            Julien voit la douleur dès aujourd&apos;hui et peut ajuster le programme.
          </p>
        )}
      </div>

      <ul className="mt-10 space-y-1 text-left text-sm text-slate-600">
        {otherRows.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between border-b border-slate-100 py-3">
            <span className="font-medium text-slate-900">{row.label}</span>
            <span>{val(row.app)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const VARIANTS = [ComparisonSlider, ComparisonFlipCards, ComparisonSimulation];

export default function ComparaisonPrototypePage() {
  const [current, setCurrent] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const [ready, setReady] = useState(false);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const v = parseInt(new URLSearchParams(window.location.search).get("v") ?? "", 10);
    if (v >= 1 && v <= VARIANTS.length) setCurrent(v - 1);
  }, []);

  const moveHighlight = () => {
    const el = itemRefs.current[current];
    if (!el || !highlightRef.current) return;
    highlightRef.current.style.width = `${el.offsetWidth}px`;
    highlightRef.current.style.transform = `translateX(${el.offsetLeft}px)`;
  };

  useEffect(() => {
    moveHighlight();
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(current + 1));
    window.history.replaceState(null, "", url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    window.addEventListener("resize", moveHighlight);
    const raf1 = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => {
      window.removeEventListener("resize", moveHighlight);
      cancelAnimationFrame(raf1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= VARIANTS.length) setCurrent(num - 1);
      else if (e.key === "ArrowRight") setCurrent((c) => (c + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") setCurrent((c) => (c - 1 + VARIANTS.length) % VARIANTS.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const Variant = VARIANTS[current];

  return (
    <div className="min-h-screen bg-[#f6f8fd]">
      <style dangerouslySetInnerHTML={{ __html: PICKER_CSS }} />
      <div key={mountKey}>
        <Variant />
      </div>

      <nav className="proto-picker" aria-label="Prototype variants" data-ready={ready ? "" : undefined}>
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {VARIANT_NAMES.map((name, i) => (
          <button
            key={name}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            className="proto-picker-item"
            data-active={i === current ? "" : undefined}
            aria-current={i === current ? "true" : undefined}
            onClick={() => {
              setCurrent(i);
              setMountKey((k) => k + 1);
            }}
          >
            {name}
          </button>
        ))}
      </nav>
    </div>
  );
}
