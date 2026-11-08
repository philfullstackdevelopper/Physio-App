import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogoLockup } from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { SIGNUPS_OPEN, WAITLIST_HREF } from "@/lib/launchFlags";

// Libellés : messages/<langue>/home.json (home.footer).
const COLUMNS = [
  {
    title: "product",
    // « Comment ça marche » retiré : la section n'existe plus (Philippe, 2026-11-06 : audit, on allège).
    links: [
      { href: "/#comparaison", label: "comparison" },
      { href: "/#tarifs", label: "pricing" },
    ],
  },
  {
    title: "space",
    links: [
      { href: "/login", label: "patientLogin" },
      SIGNUPS_OPEN
        ? { href: "/signup/kine", label: "createKineAccount" }
        : { href: WAITLIST_HREF, label: "waitlist" },
      { href: "/#faq", label: "faq" },
    ],
  },
  {
    title: "legal",
    links: [
      { href: "/cgu", label: "cgu" },
      { href: "/confidentialite", label: "privacy" },
      { href: "/mentions-legales", label: "legalNotice" },
    ],
  },
];

export default function SiteFooter() {
  const t = useTranslations("home.footer");
  return (
    <footer className="border-t border-slate-200/70 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <LogoLockup height={40} />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
            {t("tagline")}
          </p>
          {/* Ligne de texte simple (2026-10-16) : la pastille à point vert, sur
              deux lignes en étroit, « faisait bugué ». */}
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-500">
            {t("hosting")}
          </p>
          {/* Une ligne datée, tirée de l'historique réel du projet : montre un
              produit vivant, tenu par des gens (2026-10-10). À mettre à jour
              à chaque évolution visible. */}
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-400">
            {t.rich("changelog", { b: (c) => <span className="font-semibold text-slate-500">{c}</span> })}
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
              {t(`columns.${col.title}`)}
            </p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-slate-600 transition hover:text-blue-700"
                  >
                    {t(`links.${l.label}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Sélecteur de langue sur téléphone seulement : l'en-tête n'a pas
              la place à cette largeur (PC et tablette : dans l'en-tête). */}
          <LanguageSwitcher className="mx-auto mb-2 sm:hidden" />
          <p className="text-center text-xs text-slate-400 sm:text-left">
            {t("copyright")}
          </p>
          <p className="text-center text-[11px] italic text-slate-300 sm:text-right">
            {t("illustrations")}{" "}
            <a href="https://injurymap.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-400">
              Injurymap
            </a>{" "}
            (CC BY 4.0)
          </p>
        </div>
      </div>
    </footer>
  );
}
