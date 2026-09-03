"use client";

// Prototype surface — divergent presentation ideas for the "Tarifs" section.
// Not linked from production nav. Delete this route once a direction is
// promoted into app/page.tsx (see superpowers/prototype skill, Hard Rule 5).

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

const VARIANT_NAMES = ["Quiet", "Audience switch", "Big number"];

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

function PricingQuiet() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">Tarifs</p>
      <h2 className="font-display mt-2 max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
        Gratuite pour les patients, simple pour les cabinets
      </h2>

      <div className="mt-16 grid gap-12 sm:grid-cols-2 sm:divide-x sm:divide-slate-200">
        <div className="flex flex-col">
          <p className="text-sm font-medium text-slate-500">Patients</p>
          <p className="font-display mt-2 text-3xl font-semibold text-slate-900">
            Gratuit<span className="text-base font-normal text-slate-400">, toujours</span>
          </p>
          <ul className="mt-8 space-y-3 text-sm leading-relaxed text-slate-600">
            <li>Aucune carte bancaire demandée</li>
            <li>Accès via l&apos;invitation de votre praticien</li>
            <li>Historique complet de vos séances conservé</li>
          </ul>
          <a
            href="#"
            className="mt-auto pt-10 text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-blue-700 hover:underline"
          >
            Me connecter →
          </a>
        </div>

        <div className="flex flex-col sm:pl-12">
          <p className="text-sm font-medium text-blue-700">
            Cabinets &amp; praticiens
            <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-blue-400">
              · Bêta
            </span>
          </p>
          <p className="font-display mt-2 text-3xl font-semibold text-slate-900">
            Gratuit<span className="text-base font-normal text-slate-400"> sur invitation</span>
          </p>
          <ul className="mt-8 space-y-3 text-sm leading-relaxed text-slate-600">
            <li>Patients illimités</li>
            <li>Bibliothèque d&apos;exercices avec vidéos</li>
            <li>Suivi d&apos;assiduité et signalements de douleur</li>
            <li>Ajustement de programme à distance</li>
            <li>Facturation intégrée</li>
          </ul>
          <a
            href="#"
            className="mt-10 inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.97]"
          >
            Demander un accès →
          </a>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Le tarif définitif sera annoncé avant la fin de la bêta. Les cabinets pionniers
            garderont des conditions avantageuses.
          </p>
        </div>
      </div>
    </div>
  );
}

const AUDIENCE_PLANS = {
  patient: {
    tab: "Je suis patient",
    eyebrow: "Patients",
    price: "Gratuit",
    suffix: ", toujours",
    features: [
      "Aucune carte bancaire demandée",
      "Accès via l'invitation de votre praticien",
      "Historique complet de vos séances conservé",
    ],
    cta: "Me connecter",
    ctaStyle: "ghost" as const,
  },
  praticien: {
    tab: "Je suis praticien",
    eyebrow: "Cabinets & praticiens · Bêta",
    price: "Gratuit",
    suffix: " sur invitation",
    features: [
      "Patients illimités",
      "Bibliothèque d'exercices avec vidéos",
      "Suivi d'assiduité et signalements de douleur",
      "Ajustement de programme à distance",
      "Facturation intégrée",
    ],
    cta: "Demander un accès",
    ctaStyle: "filled" as const,
    note: "Le tarif définitif sera annoncé avant la fin de la bêta.",
  },
};

function PricingAudienceSwitch() {
  const [who, setWho] = useState<"patient" | "praticien">("patient");
  const plan = AUDIENCE_PLANS[who];

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">Tarifs</p>
      <h2 className="font-display mt-2 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
        Gratuite pour les patients, simple pour les cabinets
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
        Les deux sont gratuits — ce qui change, c&apos;est ce que vous voyez.
      </p>

      <div className="mx-auto mt-8 inline-flex rounded-full bg-slate-100 p-1">
        {(["patient", "praticien"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setWho(key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              who === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {AUDIENCE_PLANS[key].tab}
          </button>
        ))}
      </div>

      <div
        key={who}
        className="animate-[fadeInUp_0.4s_ease-out_both] mt-10 rounded-3xl border border-slate-200/70 bg-white p-10 text-left"
      >
        <p className="text-sm font-medium text-blue-700">{plan.eyebrow}</p>
        <p className="font-display mt-2 text-5xl font-semibold text-slate-900">
          {plan.price}
          <span className="text-lg font-normal text-slate-400">{plan.suffix}</span>
        </p>
        <ul className="mx-auto mt-8 max-w-xs space-y-2.5 text-sm text-slate-600">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" strokeWidth={2.5} />
              {f}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`mt-8 inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-medium transition active:scale-[0.97] ${
            plan.ctaStyle === "filled"
              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              : "text-slate-600 underline-offset-4 hover:text-blue-700 hover:underline"
          }`}
        >
          {plan.cta} →
        </button>
        {"note" in plan && plan.note && (
          <p className="mt-4 text-xs leading-relaxed text-slate-500">{plan.note}</p>
        )}
      </div>
    </div>
  );
}

function PricingBigNumber() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">Tarifs</p>
      <h2 className="font-display mt-2 max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
        Le patient paie son kiné. Le kiné paie EasyPhysio.
      </h2>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/70 p-8">
          <p className="text-sm font-medium text-slate-500">Patients</p>
          <p className="font-display mt-3 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Fixé par votre kiné
          </p>
          <p className="mt-2 text-sm text-slate-400">réglé directement à votre praticien, via Stripe</p>
          <ul className="mt-8 space-y-2 text-sm text-slate-600">
            <li>
              Accès uniquement sur invitation d&apos;un kinésithérapeute déjà inscrit sur
              EasyPhysio
            </li>
            <li>Paiement sécurisé, directement à votre kiné</li>
            <li>Historique complet de vos séances conservé</li>
          </ul>
          <a
            href="#"
            className="mt-8 inline-block text-sm font-medium text-slate-600 transition hover:text-blue-700"
          >
            Me connecter →
          </a>
        </div>

        <div className="rounded-2xl bg-blue-600 p-8 text-white">
          <p className="text-sm font-medium text-blue-100">Cabinets &amp; praticiens · Bêta</p>
          <p className="font-display mt-3 text-7xl font-semibold tracking-tight">15 %</p>
          <p className="mt-1 text-sm text-blue-200">
            prélevés par patient actif, sur le tarif que vous fixez
          </p>
          <ul className="mt-8 space-y-2 text-sm text-blue-50">
            <li>Vous fixez votre tarif mensuel par patient</li>
            <li>Paiement direct par vos patients, via Stripe Connect</li>
            <li>Patients illimités</li>
            <li>Bibliothèque d&apos;exercices avec vidéos</li>
            <li>Suivi d&apos;assiduité et signalements de douleur</li>
            <li>Ajustement de programme à distance</li>
          </ul>
          <a
            href="#"
            className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 active:scale-[0.97]"
          >
            Demander un accès →
          </a>
          <p className="mt-4 text-xs leading-relaxed text-blue-100">
            Aucun abonnement fixe — la commission est prélevée automatiquement, uniquement sur vos
            patients actifs.
          </p>
        </div>
      </div>
    </div>
  );
}

const VARIANTS = [PricingQuiet, PricingAudienceSwitch, PricingBigNumber];

export default function TarifsPrototypePage() {
  const [current, setCurrent] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const [ready, setReady] = useState(false);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Restore selection from ?v= on mount.
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
    const raf1 = requestAnimationFrame(() =>
      requestAnimationFrame(() => setReady(true)),
    );
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

      <nav
        ref={pickerRef}
        className="proto-picker"
        aria-label="Prototype variants"
        data-ready={ready ? "" : undefined}
      >
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
