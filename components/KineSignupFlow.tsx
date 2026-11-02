"use client";

import { useState } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { brandedHeaderTitle } from "@/lib/clerk/brandedTitle";
import { compactClerkElements } from "@/lib/clerk/compact";
import { findCabinetByRpps } from "@/app/signup/kine/actions";

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

// Inscription libre (Philippe, 2026-11-02) : le kiné paie son accès, on ne
// vérifie donc plus qu'il est inscrit à l'Ordre. Le RPPS est FACULTATIF et ne
// sert plus que de raccourci : s'il est reconnu par l'Annuaire Santé, une
// carte « C'est bien vous ? » propose de remplir le cabinet en un clic.
// Sinon, le kiné remplit simplement nom du cabinet, adresse et téléphone.
type Found = { fullName: string; cabinetName: string | null; cabinetAddress: string | null; phone: string | null };

export default function KineSignupFlow() {
  const [step, setStep] = useState<"cabinet" | "account">("cabinet");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({ cabinetName: "", cabinetAddress: "", phone: "", rppsNumber: "", siret: "" });
  const [lookup, setLookup] = useState<"idle" | "searching" | "notFound">("idle");
  const [found, setFound] = useState<Found | null>(null);

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

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
      setError("Merci d'indiquer le nom du cabinet, son adresse et un téléphone.");
      return;
    }
    if (rppsNumber && !/^\d{9,11}$/.test(rppsNumber)) {
      setError("Le numéro RPPS ou ADELI ne contient que des chiffres (ou laissez-le vide).");
      return;
    }
    if (siret && !/^\d{14}$/.test(siret)) {
      setError("Le SIRET doit contenir 14 chiffres (ou laissez-le vide).");
      return;
    }

    const payload = encodeURIComponent(
      JSON.stringify({ cabinetName, cabinetAddress, phone, rppsNumber: rppsNumber || null, siret: siret || null }),
    );
    document.cookie = `${COOKIE_NAME}=${payload}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    setError(null);
    setStep("account");
  };

  if (step === "account") {
    return (
      <div>
        <p className="text-sm leading-relaxed text-slate-600 max-sm:hidden short:hidden">
          Vos patients n&apos;ont pas besoin de créer de compte ici — c&apos;est vous qui les
          invitez depuis votre tableau de bord, une fois inscrit·e.
        </p>
        <div className="mt-5 short:mt-2">
          <SignUp
            fallbackRedirectUrl="/signup/finalize"
            signInUrl="/login"
            appearance={{ elements: { ...compactClerkElements, rootBox: "w-full", cardBox: "w-full", headerTitle: brandedHeaderTitle } }}
          />
          <p className="mt-4 text-center text-xs leading-relaxed text-slate-400 short:hidden">
            Votre espace est prêt dès la création du compte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-slate-900"><span className="text-blue-700">EasyPhysio ·</span>{" "}Votre cabinet</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 short:hidden">
        Quelques informations pour vos notes d&apos;honoraires et vos patients.
      </p>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 short:mt-3 short:gap-2.5">
        <div>
          <span className="text-sm font-medium text-slate-700">
            Numéro RPPS <span className="font-normal text-slate-400">(facultatif)</span>
          </span>
          <div className="mt-1.5 flex gap-2 short:mt-1">
            <input
              type="text"
              name="rpps_number"
              inputMode="numeric"
              placeholder="11 chiffres"
              value={fields.rppsNumber}
              onChange={(e) => {
                set("rppsNumber")(e);
                setLookup("idle");
                setFound(null);
              }}
              aria-label="Numéro RPPS (facultatif)"
              className={`${fieldClass} mt-0 short:mt-0`}
            />
            <button
              type="button"
              onClick={searchRpps}
              disabled={lookup === "searching" || !fields.rppsNumber.trim()}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-50"
            >
              {lookup === "searching" ? "Recherche…" : "Retrouver mon cabinet"}
            </button>
          </div>
          {lookup === "notFound" && (
            <span className="mt-1 block text-xs text-slate-500">
              Numéro non retrouvé dans l&apos;Annuaire Santé — pas de souci, remplissez simplement les champs ci-dessous.
            </span>
          )}
          {found && (
            <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-sm">
              <p className="font-medium text-slate-900">C&apos;est bien vous ? {found.fullName}</p>
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
                  Utiliser ces informations
                </button>
                <button
                  type="button"
                  onClick={() => setFound(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900"
                >
                  Non, je remplis moi-même
                </button>
              </div>
            </div>
          )}
        </div>

        <label>
          <span className="text-sm font-medium text-slate-700">Nom du cabinet</span>
          <input
            type="text"
            name="cabinet_name"
            required
            value={fields.cabinetName}
            onChange={set("cabinetName")}
            placeholder="ex. Cabinet de kinésithérapie du Parc"
            className={fieldClass}
          />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">Adresse du cabinet</span>
          <input
            type="text"
            name="cabinet_address"
            required
            value={fields.cabinetAddress}
            onChange={set("cabinetAddress")}
            placeholder="12 rue des Lilas, 75011 Paris"
            className={fieldClass}
          />
        </label>

        <div className="flex flex-col gap-4 short:grid short:grid-cols-2 short:gap-3">
          <label>
            <span className="text-sm font-medium text-slate-700">Téléphone</span>
            <input
              type="tel"
              name="phone"
              required
              value={fields.phone}
              onChange={set("phone")}
              placeholder="06 12 34 56 78"
              className={fieldClass}
            />
          </label>

          <label>
            <span className="text-sm font-medium text-slate-700">
              SIRET <span className="font-normal text-slate-400">(facultatif)</span>
            </span>
            <input
              type="text"
              name="siret"
              inputMode="numeric"
              value={fields.siret}
              onChange={set("siret")}
              placeholder="14 chiffres"
              className={fieldClass}
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-2 rounded-xl bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 short:mt-1"
        >
          Continuer
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 short:mt-3">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-blue-700 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
