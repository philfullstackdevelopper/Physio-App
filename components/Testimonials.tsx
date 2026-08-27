import RevealGroup, { RevealItem } from "@/components/RevealGroup";

const TESTIMONIALS = [
  {
    quote:
      "Je vois qui a fait ses exercices avant même d'ouvrir le dossier. Les consultations commencent par ce qui compte vraiment.",
    name: "Julien M.",
    role: "Kinésithérapeute",
    city: "Lyon",
    offset: "lg:mt-0",
  },
  {
    quote:
      "Je savais enfin quoi faire le soir, et dans quel ordre. La vidéo m'évite de deviner le mouvement entre deux rendez-vous.",
    name: "Claire D.",
    role: "Patiente, rééducation épaule",
    city: "Villeurbanne",
    offset: "lg:mt-8",
  },
  {
    quote:
      "Les retours de douleur changent tout : j'ajuste le programme le jour même au lieu d'attendre la séance suivante.",
    name: "Nadia B.",
    role: "Kinésithérapeute",
    city: "Bordeaux",
    offset: "lg:mt-4",
  },
];

export default function Testimonials() {
  return (
    <RevealGroup className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {TESTIMONIALS.map((t) => (
        <RevealItem
          as="figure"
          key={t.name}
          className={`flex flex-col rounded-3xl border border-slate-200/70 bg-white p-7 shadow-sm ${t.offset}`}
        >
          <span aria-hidden className="font-display text-4xl leading-none text-blue-200">
            &ldquo;
          </span>
          <blockquote className="mt-1 flex-1 text-sm leading-relaxed text-slate-700">
            {t.quote}
          </blockquote>
          <figcaption className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-900">{t.name}</p>
            <p className="text-xs text-slate-500">
              {t.role} · {t.city}
            </p>
          </figcaption>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
