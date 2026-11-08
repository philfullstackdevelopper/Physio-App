"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  MapPin,
  Quote,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

// "Utilisé au cabinet, et surtout à la maison": one featured testimonial
// (large, with a phone + dashboard mock), two secondary ones beside it. The
// Kinés / Patients toggle filters which voice leads; the pager rotates the
// featured card through the set. Portraits are AI-generated stand-ins
// (public/testimonials/, cropped from the 2026-09-04 landing mockup) —
// replace with real, consented photos when the testimonials are real.

type Voice = "kine" | "patient";

// Citation, rôle et phrase-clé : messages/<langue>/home.json
// (home.testimonials.<id>.quote / role / highlight).
const TESTIMONIALS: {
  id: "julien" | "claire" | "nadia";
  name: string;
  photo: string;
  city: string;
  voice: Voice;
}[] = [
  {
    id: "julien",
    name: "Julien M.",
    photo: "/testimonials/julien.png",
    city: "Lyon",
    voice: "kine",
  },
  {
    id: "claire",
    name: "Claire D.",
    photo: "/testimonials/claire.png",
    city: "Villeurbanne",
    voice: "patient",
  },
  {
    id: "nadia",
    name: "Nadia B.",
    photo: "/testimonials/nadia.png",
    city: "Bordeaux",
    voice: "kine",
  },
];

// « Soutien kiné 7j/7 » retiré le 2026-10-10 : ce service n'existe pas.
const TRUST = ["trust1", "trust2", "trust3"] as const;

function Avatar({ src, name, size = "sm" }: { src: string; name: string; size?: "sm" | "lg" }) {
  const tr = useTranslations("home.testimonials");
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static local PNG
    <img
      src={src}
      alt={tr("portrait", { name })}
      width={size === "lg" ? 80 : 56}
      height={size === "lg" ? 80 : 56}
      className={`shrink-0 rounded-full object-cover ring-4 ring-white ${
        size === "lg" ? "h-20 w-20" : "h-14 w-14"
      }`}
    />
  );
}

function Identity({ t, size = "sm" }: { t: (typeof TESTIMONIALS)[number]; size?: "sm" | "lg" }) {
  const tr = useTranslations("home.testimonials");
  return (
    <div className="flex items-center gap-4">
      <Avatar src={t.photo} name={t.name} size={size} />
      <div>
        <p className={`font-semibold text-slate-900 ${size === "lg" ? "text-xl" : "text-base"}`}>{t.name}</p>
        <p className="text-sm text-slate-500">{tr(`${t.id}.role`)}</p>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-blue-600">
          <MapPin className="h-3.5 w-3.5" strokeWidth={2} /> {t.city}
        </p>
      </div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: Voice;
  onChange: (v: Voice) => void;
}) {
  const tr = useTranslations("home.testimonials");
  const opts: { v: Voice; label: string; icon: LucideIcon }[] = [
    { v: "kine", label: tr("kines"), icon: User },
    { v: "patient", label: tr("patients"), icon: Users },
  ];
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            value === o.v ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <o.icon className="h-4 w-4" strokeWidth={1.75} /> {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Testimonials() {
  const tr = useTranslations("home.testimonials");
  const [voice, setVoice] = useState<Voice>("kine");
  const [index, setIndex] = useState(0);

  // Featured = the index-th testimonial, but the toggle jumps to the first
  // matching voice so "Patients" immediately shows a patient up front.
  const featured = TESTIMONIALS[index];
  const others = TESTIMONIALS.filter((_, i) => i !== index);

  function selectVoice(v: Voice) {
    setVoice(v);
    const first = TESTIMONIALS.findIndex((t) => t.voice === v);
    if (first >= 0) setIndex(first);
  }
  function step(delta: number) {
    const next = (index + delta + TESTIMONIALS.length) % TESTIMONIALS.length;
    setIndex(next);
    setVoice(TESTIMONIALS[next].voice);
  }

  return (
    <div className="mt-8 sm:short:mt-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Téléphone (Philippe, 2026-10-10) : une seule commande, les flèches
            « 1 / 3 » — la bascule Kinés / Patients et la pastille faisaient
            doublon et « trop IA ». La mention « illustratifs » reste, en
            simple ligne de texte sous la carte (voir plus bas). */}
        <div className="flex flex-wrap items-center gap-3 max-sm:hidden">
          <Toggle value={voice} onChange={selectVoice} />
          {/* Ces trois témoignages sont des exemples rédigés (portraits
              générés), EasyPhysio n'ayant pas encore d'utilisateurs : on le
              dit. À retirer dès qu'ils sont remplacés par de vrais retours,
              avec l'accord écrit des personnes (2026-10-10). */}
          <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500">
            {tr("illustrative")}
          </span>
        </div>
        <div className="flex items-center gap-3 max-sm:mx-auto">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={tr("previous")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <span className="text-sm tabular-nums text-slate-500">
            {index + 1} / {TESTIMONIALS.length}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={tr("next")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:short:mt-4 sm:short:gap-4 lg:grid-cols-[1.9fr_1fr]">
        <AnimatePresence mode="wait">
          <motion.figure
            key={featured.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-9 sm:short:p-6"
          >
            <div>
              <Identity t={featured} size="lg" />
              <Quote className="mt-4 h-6 w-6 text-blue-600 sm:mt-6 sm:short:mt-3" strokeWidth={2} fill="currentColor" />
              <blockquote className="font-display mt-3 max-w-2xl text-xl leading-snug text-slate-900 sm:text-[1.7rem] sm:short:text-[1.4rem]">
                {tr(`${featured.id}.quote`)}
              </blockquote>
              <figcaption className="mt-4 sm:mt-6 sm:short:mt-4 inline-flex items-center gap-3 rounded-xl bg-blue-50/70 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600">
                  <TrendingUp className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="text-sm text-slate-700">{tr(`${featured.id}.highlight`)}</span>
              </figcaption>
            </div>
          </motion.figure>
        </AnimatePresence>

        {/* Les deux autres témoignages seulement dès lg (à côté du principal) :
            empilés dessous, ils doubleraient la hauteur de la section — les
            flèches permettent de tous les parcourir. */}
        <div className="hidden gap-5 lg:grid">
          {others.map((t) => (
            <figure
              key={t.name}
              className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm sm:short:p-4"
            >
              <Identity t={t} />
              <blockquote className="mt-4 sm:short:mt-2 flex gap-2 text-sm leading-relaxed text-slate-700">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" strokeWidth={2} fill="currentColor" />
                <span>{tr(`${t.id}.quote`)}</span>
              </blockquote>
            </figure>
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400 sm:hidden">{tr("illustrative")}</p>

      {/* Bandeau secondaire, masqué sur écran peu haut pour que la section tienne. */}
      <div className="mt-8 text-center sm:short:hidden">
        <ul className=" flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {TRUST.map((label) => (
            <li key={label} className="flex items-center gap-2 text-sm text-slate-700">
              <CircleCheck className="h-4 w-4 text-blue-600" strokeWidth={2} /> {tr(label)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
