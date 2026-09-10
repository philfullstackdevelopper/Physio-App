"use client";

import { useState } from "react";
import { SignUp } from "@clerk/nextjs";

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
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10";

export default function KineSignupFlow() {
  const [step, setStep] = useState<"cabinet" | "account">("cabinet");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const cabinetName = String(data.get("cabinet_name") ?? "").trim();
    const cabinetAddress = String(data.get("cabinet_address") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const rppsNumber = String(data.get("rpps_number") ?? "").replace(/\s+/g, "");
    const siret = String(data.get("siret") ?? "").replace(/\s+/g, "");

    if (!cabinetName || !cabinetAddress || !phone || !rppsNumber) {
      setError("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (!/^\d{9,11}$/.test(rppsNumber)) {
      setError("Le numéro RPPS ou ADELI doit contenir uniquement des chiffres.");
      return;
    }
    if (siret && !/^\d{14}$/.test(siret)) {
      setError("Le SIRET doit contenir 14 chiffres.");
      return;
    }

    const payload = encodeURIComponent(
      JSON.stringify({ cabinetName, cabinetAddress, phone, rppsNumber, siret: siret || null }),
    );
    document.cookie = `${COOKIE_NAME}=${payload}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    setError(null);
    setStep("account");
  };

  if (step === "account") {
    return (
      <div>
        <p className="text-sm leading-relaxed text-slate-600">
          Vos patients n&apos;ont pas besoin de créer de compte ici — c&apos;est vous qui les
          invitez depuis votre tableau de bord, une fois inscrit·e.
        </p>
        <div className="mt-5">
          <SignUp
            fallbackRedirectUrl="/signup/finalize"
            signInUrl="/login"
            appearance={{ elements: { rootBox: "w-full", cardBox: "w-full" } }}
          />
          <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">
            Votre demande sera vérifiée avant activation de votre compte praticien.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-slate-900">Votre cabinet</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Quelques informations professionnelles avant de créer votre compte — elles nous
        permettent de vérifier votre inscription.
      </p>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label>
          <span className="text-sm font-medium text-slate-700">Nom du cabinet</span>
          <input
            type="text"
            name="cabinet_name"
            required
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
            placeholder="12 rue des Lilas, 75011 Paris"
            className={fieldClass}
          />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">Téléphone professionnel</span>
          <input type="tel" name="phone" required placeholder="06 12 34 56 78" className={fieldClass} />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">Numéro RPPS ou ADELI</span>
          <input
            type="text"
            name="rpps_number"
            required
            inputMode="numeric"
            placeholder="11 chiffres"
            className={fieldClass}
          />
          <span className="mt-1 block text-xs text-slate-400">
            Votre identifiant professionnel — voir{" "}
            <a
              href="https://www.ordremk.fr/je-suis-kinesitherapeute/exercice/minscrire-a-lordre/mon-identifiant-rpps/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-600"
            >
              où le trouver
            </a>
            .
          </span>
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">
            SIRET <span className="font-normal text-slate-400">(optionnel)</span>
          </span>
          <input type="text" name="siret" inputMode="numeric" placeholder="14 chiffres" className={fieldClass} />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-xl bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700"
        >
          Continuer
        </button>
      </form>
    </div>
  );
}
