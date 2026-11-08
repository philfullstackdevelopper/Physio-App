"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { ArrowLeft, Building2, Search, Users } from "lucide-react";
import { brandedHeaderTitle } from "@/lib/clerk/brandedTitle";
import { compactClerkElements } from "@/lib/clerk/compact";
import { findCabinetByRpps, searchCabinetsForSignup } from "@/app/signup/kine/actions";
import type { CabinetSearchResult } from "@/lib/db/cabinets";
import { useTranslations } from "next-intl";

// Cabinet details FIRST, account creation LAST — the order a professional
// signup on a real B2B site follows (Philippe, 2026-09-10), reversed from
// the original "Clerk account, then cabinet form" order. Since there's no
// account yet at step 1, these fields can't be saved to `instructors` the
// normal RLS way (no row to attach them to) — they're stashed in a
// short-lived cookie instead, which survives Clerk's own internal
// navigation because it's a same-origin cookie, not client-only state.
// app/signup/finalize/page.tsx reads that cookie server-side once the
// Clerk account exists, and creates the `instructors` row already complete
// — no separate "now tell us your cabinet" step after signup for anyone who
// came through this flow. app/signup/onboarding stays as the recovery path
// for the rare case the cookie didn't make it (cleared cookies, a very slow
// signup where it expired, etc.).
const COOKIE_NAME = "pending_cabinet";
const COOKIE_MAX_AGE = 60 * 15; // 15 min — plenty for filling out Clerk's form, short enough to not linger

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm short:mt-1 short:py-2 transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10";

// Inscription libre (Philippe, 2026-11-02 ; gratuit pour le kiné depuis le 2026-11-04) : on ne
// vérifie donc plus qu'il est inscrit à l'Ordre. Le RPPS est FACULTATIF et ne
// sert plus que de raccourci : s'il est reconnu par l'Annuaire Santé, une
// carte « C'est bien vous ? » propose de remplir le cabinet en un clic.
// Sinon, le kiné remplit simplement nom du cabinet, adresse et téléphone.
type Found = { fullName: string; cabinetName: string | null; cabinetAddress: string | null; phone: string | null };

// Cabinets (Philippe, 2026-11-08) : avant le formulaire, « Votre cabinet est-il
// déjà sur EasyPhysio ? ». Le kiné le cherche et demande à le REJOINDRE (un
// collègue validera, migration 0085), sinon il l'INSCRIT avec le formulaire
// habituel et en devient le fondateur. Le choix part dans le même cookie,
// lu par app/signup/finalize.
export default function KineSignupFlow() {
  const [step, setStep] = useState<"cabinet" | "account">("cabinet");
  const [mode, setMode] = useState<"search" | "join" | "create">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CabinetSearchResult[] | null>(null);
  const [joining, setJoining] = useState<CabinetSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({ cabinetName: "", cabinetAddress: "", phone: "", rppsNumber: "", siret: "" });
  const [lookup, setLookup] = useState<"idle" | "searching" | "notFound">("idle");
  const [found, setFound] = useState<Found | null>(null);
  const t = useTranslations("auth.cabinet");
  const tKine = useTranslations("auth.signupKine");
  const tShared = useTranslations("auth.shared");

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  // Recherche au fil de la frappe (300 ms après la dernière lettre).
  useEffect(() => {
    if (mode !== "search") return;
    const q = query.trim();
    // Moins de 2 lettres : rien à chercher (la liste est masquée à l'affichage).
    if (q.length < 2) return;
    let live = true;
    const timer = setTimeout(async () => {
      const found = await searchCabinetsForSignup(q).catch(() => []);
      if (live) setResults(found);
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, mode]);

  const startJoin = (c: CabinetSearchResult) => {
    setJoining(c);
    setMode("join");
    setError(null);
  };

  const saveAndContinue = (payload: Record<string, unknown>) => {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    setError(null);
    setStep("account");
  };

  const handleJoin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!joining) return;
    const phone = fields.phone.trim();
    const rppsNumber = fields.rppsNumber.replace(/\s+/g, "");
    if (!phone) {
      setError(t("errorPhone"));
      return;
    }
    if (rppsNumber && !/^\d{9,11}$/.test(rppsNumber)) {
      setError(t("errorRppsDigitsOrEmpty"));
      return;
    }
    saveAndContinue({
      mode: "join",
      cabinetId: joining.id,
      cabinetName: joining.name,
      cabinetAddress: joining.address ?? [joining.postal_code, joining.city].filter(Boolean).join(" "),
      phone,
      rppsNumber: rppsNumber || null,
      siret: null,
    });
  };

  const searchRpps = async () => {
    const rpps = fields.rppsNumber.replace(/\s+/g, "");
    setFound(null);
    if (!/^\d{9,11}$/.test(rpps)) {
      setLookup("notFound");
      return;
    }
    setLookup("searching");
    const match = await findCabinetByRpps(rpps).catch(() => null);
    setFound(match);
    setLookup(match ? "idle" : "notFound");
  };

  const useFound = () => {
    if (!found) return;
    setFields((f) => ({
      ...f,
      cabinetName: found.cabinetName ?? f.cabinetName,
      cabinetAddress: found.cabinetAddress ?? f.cabinetAddress,
      phone: found.phone ?? f.phone,
    }));
    setFound(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cabinetName = fields.cabinetName.trim();
    const cabinetAddress = fields.cabinetAddress.trim();
    const phone = fields.phone.trim();
    const rppsNumber = fields.rppsNumber.replace(/\s+/g, "");
    const siret = fields.siret.replace(/\s+/g, "");

    if (!cabinetName || !cabinetAddress || !phone) {
      setError(t("errorRequired"));
      return;
    }
    if (rppsNumber && !/^\d{9,11}$/.test(rppsNumber)) {
      setError(t("errorRppsDigitsOrEmpty"));
      return;
    }
    if (siret && !/^\d{14}$/.test(siret)) {
      setError(t("errorSiretDigitsOrEmpty"));
      return;
    }

    saveAndContinue({ mode: "create", cabinetName, cabinetAddress, phone, rppsNumber: rppsNumber || null, siret: siret || null });
  };

  if (step === "account") {
    return (
      <div>
        <p className="text-sm leading-relaxed text-slate-600 max-sm:hidden short:hidden">
          {tKine("patientsNoAccount")}
        </p>
        <div className="mt-5 short:mt-2">
          <SignUp
            fallbackRedirectUrl="/signup/finalize"
            signInUrl="/login"
            appearance={{ elements: { ...compactClerkElements, rootBox: "w-full", cardBox: "w-full", headerTitle: brandedHeaderTitle } }}
          />
          <p className="mt-4 text-center text-xs leading-relaxed text-slate-400 short:hidden">
            {tKine("spaceReady")}
          </p>
        </div>
      </div>
    );
  }

  const title = (
    <h1 className="font-display text-2xl font-semibold text-slate-900">{t.rich("title", { brand: (c) => <span className="text-blue-700">{c}</span> })}</h1>
  );
  const haveAccount = (
    <p className="mt-6 text-center text-sm text-slate-500 short:mt-3">
      {tShared("haveAccount")}{" "}
      <Link href="/login" className="font-medium text-blue-700 hover:underline">
        {tShared("signIn")}
      </Link>
    </p>
  );

  if (mode === "search") {
    return (
      <div>
        {title}
        <p className="mt-3 font-medium text-slate-900 short:mt-2">{t("chooseQuestion")}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 short:hidden">{t("chooseHelp")}</p>
        <div className="relative mt-4 short:mt-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchAria")}
            autoFocus
            className={`${fieldClass} mt-0 pl-10 short:mt-0`}
          />
        </div>
        {results && query.trim().length >= 2 && (
          <ul className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto short:max-h-40" aria-live="polite">
            {results.length === 0 && <li className="px-1 text-sm text-slate-500">{t("searchNone")}</li>}
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => startJoin(c)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <Building2 className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{c.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {[c.postal_code, c.city].filter(Boolean).join(" ") || c.address}
                      {" · "}
                      {t("kineCount", { count: c.members })}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium text-blue-700">{t("join")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => {
            setMode("create");
            setError(null);
            if (!fields.cabinetName && query.trim().length >= 2) setFields((f) => ({ ...f, cabinetName: query.trim() }));
          }}
          className="mt-4 w-full rounded-xl border border-dashed border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 short:mt-3"
        >
          {t("createInstead")}
        </button>
        {haveAccount}
      </div>
    );
  }

  if (mode === "join" && joining) {
    return (
      <div>
        {title}
        <button
          type="button"
          onClick={() => {
            setMode("search");
            setError(null);
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          {t("changeCabinet")}
        </button>
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="flex items-center gap-2 font-medium text-slate-900">
            <Users className="h-4 w-4 text-blue-600" strokeWidth={1.75} />
            {t("joinTitle", { name: joining.name })}
          </p>
          <p className="mt-1 text-sm text-slate-600">{t("joinHelp")}</p>
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleJoin} className="mt-4 flex flex-col gap-4 short:mt-3 short:gap-2.5">
          <label>
            <span className="text-sm font-medium text-slate-700">{t("phoneShortLabel")}</span>
            <input type="tel" name="phone" required value={fields.phone} onChange={set("phone")} placeholder={t("phonePlaceholder")} className={fieldClass} />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">
              {t("rppsLabel")} <span className="font-normal text-slate-400">{t("optional")}</span>
            </span>
            <input
              type="text"
              name="rpps_number"
              inputMode="numeric"
              value={fields.rppsNumber}
              onChange={set("rppsNumber")}
              placeholder={t("rppsPlaceholder")}
              className={fieldClass}
            />
          </label>
          <button type="submit" className="mt-2 rounded-xl bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 short:mt-1">
            {tShared("continue")}
          </button>
        </form>
        {haveAccount}
      </div>
    );
  }

  return (
    <div>
      {title}
      <button
        type="button"
        onClick={() => {
          setMode("search");
          setError(null);
        }}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 short:mt-1"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        {t("backToSearch")}
      </button>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 short:hidden">
        {t("intro")}
      </p>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 short:mt-3 short:gap-2.5">
        <div>
          <span className="text-sm font-medium text-slate-700">
            {t("rppsLabel")} <span className="font-normal text-slate-400">{t("optional")}</span>
          </span>
          <div className="mt-1.5 flex gap-2 short:mt-1">
            <input
              type="text"
              name="rpps_number"
              inputMode="numeric"
              placeholder={t("rppsPlaceholder")}
              value={fields.rppsNumber}
              onChange={(e) => {
                set("rppsNumber")(e);
                setLookup("idle");
                setFound(null);
              }}
              aria-label={t("rppsAria")}
              className={`${fieldClass} mt-0 short:mt-0`}
            />
            <button
              type="button"
              onClick={searchRpps}
              disabled={lookup === "searching" || !fields.rppsNumber.trim()}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-50"
            >
              {lookup === "searching" ? t("searching") : t("findCabinet")}
            </button>
          </div>
          {lookup === "notFound" && (
            <span className="mt-1 block text-xs text-slate-500">
              {t("notFound")}
            </span>
          )}
          {found && (
            <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-sm">
              <p className="font-medium text-slate-900">{t("isThisYou", { name: found.fullName })}</p>
              {(found.cabinetName || found.cabinetAddress) && (
                <p className="mt-0.5 text-slate-600">
                  {[found.cabinetName, found.cabinetAddress].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={useFound}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                >
                  {t("useThis")}
                </button>
                <button
                  type="button"
                  onClick={() => setFound(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900"
                >
                  {t("fillMyself")}
                </button>
              </div>
            </div>
          )}
        </div>

        <label>
          <span className="text-sm font-medium text-slate-700">{t("nameLabel")}</span>
          <input
            type="text"
            name="cabinet_name"
            required
            value={fields.cabinetName}
            onChange={set("cabinetName")}
            placeholder={t("namePlaceholder")}
            className={fieldClass}
          />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">{t("addressLabel")}</span>
          <input
            type="text"
            name="cabinet_address"
            required
            value={fields.cabinetAddress}
            onChange={set("cabinetAddress")}
            placeholder={t("addressPlaceholder")}
            className={fieldClass}
          />
        </label>

        <div className="flex flex-col gap-4 short:grid short:grid-cols-2 short:gap-3">
          <label>
            <span className="text-sm font-medium text-slate-700">{t("phoneShortLabel")}</span>
            <input
              type="tel"
              name="phone"
              required
              value={fields.phone}
              onChange={set("phone")}
              placeholder={t("phonePlaceholder")}
              className={fieldClass}
            />
          </label>

          <label>
            <span className="text-sm font-medium text-slate-700">
              SIRET <span className="font-normal text-slate-400">{t("optional")}</span>
            </span>
            <input
              type="text"
              name="siret"
              inputMode="numeric"
              value={fields.siret}
              onChange={set("siret")}
              placeholder={t("siretPlaceholder")}
              className={fieldClass}
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-2 rounded-xl bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 short:mt-1"
        >
          {tShared("continue")}
        </button>
      </form>

      {haveAccount}
    </div>
  );
}
