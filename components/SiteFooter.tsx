import Link from "next/link";
import { LogoMark } from "@/components/Logo";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { href: "/#comment-ca-marche", label: "Comment ça marche" },
      { href: "/#comparaison", label: "Comparaison" },
      { href: "/#tarifs", label: "Tarifs" },
    ],
  },
  {
    title: "Espace",
    links: [
      { href: "/login", label: "Connexion patient" },
      { href: "/signup", label: "Créer un compte praticien" },
      { href: "/forgot-password", label: "Mot de passe oublié" },
      { href: "/#faq", label: "Questions fréquentes" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/cgu", label: "CGU" },
      { href: "/confidentialite", label: "Politique de confidentialité" },
      { href: "/mentions-legales", label: "Mentions légales" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="font-display text-base font-semibold text-slate-900">EasyPhysio</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
            Les programmes de rééducation de votre kiné, suivis sérieusement à la maison.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Conforme RGPD · données jamais revendues
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
              {col.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-slate-600 transition hover:text-blue-700"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 py-5">
        <p className="text-center text-xs text-slate-400">
          © 2026 EasyPhysio, conçu avec des cabinets de kinésithérapie libéraux
        </p>
      </div>
    </footer>
  );
}
