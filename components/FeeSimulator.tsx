"use client";

// =============================================================================
// FeeSimulator — « Votre coût estimé en fin de mois » sur la page Tarif.
// Suit en direct le champ tarif (input[name=price_euros] du formulaire voisin)
// et un compteur de patients ; le calcul est estimateMonth() (mois plein).
// =============================================================================

import { useEffect, useState } from "react";
import { Info, Minus, Plus } from "lucide-react";
import { estimateMonth } from "@/lib/billing/platformFee";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export default function FeeSimulator({ initialPriceEuros, priceInputName = "price_euros" }: { initialPriceEuros: number | null; priceInputName?: string }) {
  const [priceEuros, setPriceEuros] = useState<number | null>(initialPriceEuros);
  const [patients, setPatients] = useState(10);

  // Le champ tarif vit dans le formulaire serveur d'à côté : on l'écoute.
  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>(`input[name="${priceInputName}"]`);
    if (!input) return;
    const sync = () => {
      const v = Number(input.value);
      setPriceEuros(Number.isFinite(v) && v > 0 ? v : null);
    };
    sync();
    input.addEventListener("input", sync);
    return () => input.removeEventListener("input", sync);
  }, [priceInputName]);

  const e = estimateMonth(Math.round((priceEuros ?? 0) * 100), patients);
  const ready = priceEuros !== null && patients > 0;

  const r = 44;
  const c = 2 * Math.PI * r;
  const feeLen = ready ? c * e.feeShare : 0;

  return (
    <div className="rounded-xl bg-app-bg p-5">
      <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
        Votre coût estimé en fin de mois
        <Info className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} aria-label="Estimation sur un mois complet, sans prorata" />
      </p>

      <div className="mt-4 grid items-center gap-5 xl:grid-cols-[auto_1fr_auto]">
        <div>
          <p className="text-xs text-muted">Patients abonnés (mensuel)</p>
          <div className="mt-2 inline-flex items-center rounded-lg border border-line bg-surface">
            <button
              type="button"
              onClick={() => setPatients((n) => Math.max(0, n - 1))}
              aria-label="Un patient de moins"
              className="flex h-10 w-10 items-center justify-center text-muted hover:text-ink"
            >
              <Minus className="h-4 w-4" strokeWidth={2} />
            </button>
            <input
              type="number"
              min={0}
              value={patients}
              onChange={(ev) => setPatients(Math.max(0, Math.floor(Number(ev.target.value) || 0)))}
              aria-label="Nombre de patients abonnés"
              className="w-14 border-x border-line bg-transparent text-center text-base font-semibold text-ink focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setPatients((n) => n + 1)}
              aria-label="Un patient de plus"
              className="flex h-10 w-10 items-center justify-center text-muted hover:text-ink"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="relative mx-auto h-36 w-36">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-line)" strokeWidth="10" />
            {ready && (
              <>
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-brand)" strokeWidth="10" strokeDasharray={`${c - feeLen} ${feeLen}`} strokeDashoffset={-feeLen} strokeLinecap="butt" />
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-danger)" strokeWidth="10" strokeDasharray={`${feeLen} ${c - feeLen}`} strokeLinecap="butt" />
              </>
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold text-ink">{ready ? EUR.format(e.feeCents / 100) : "—"}</span>
            <span className="text-[11px] text-muted">estimation</span>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 text-sm xl:block xl:space-y-3">
          <div>
            <dt className="text-xs text-muted">Tarif total ({patients} × {priceEuros !== null ? EUR.format(priceEuros) : "—"})</dt>
            <dd className="font-semibold text-ink">{ready ? EUR.format(e.totalCents / 100) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Votre commission ({Math.round(e.feeShare * 100)} %)</dt>
            <dd className="font-semibold text-danger">{ready ? EUR.format(e.feeCents / 100) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Vous recevez</dt>
            <dd className="font-semibold text-ok">{ready ? EUR.format(e.netCents / 100) : "—"}</dd>
          </div>
        </dl>
      </div>

      {!ready && <p className="mt-3 text-xs text-muted">Indiquez un tarif pour voir l&apos;estimation.</p>}
    </div>
  );
}
