"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, BadgeEuro, MoreVertical, RotateCcw, Settings2, Trash2, X } from "lucide-react";

const MENU_WIDTH = 320;
const SHEET_BREAKPOINT = 640; // sm — en dessous, le menu devient un tiroir bas.

// Menu de gestion d'un patient : statut de paiement + suppression (derrière
// une confirmation). Le même menu s'ouvre depuis deux endroits : le bouton
// « Gérer » de la fiche patient, et une icône compacte (`trigger="icon"`) sur
// chaque ligne de la liste « Mes patients » (Philippe, 2026-09-09 : la
// suppression doit rester accessible directement depuis la liste, à côté de
// la flèche « voir la fiche »).
//
// Le panneau est en `position: fixed`, ancré au bouton (rect mesuré à
// l'ouverture et à chaque redimensionnement), aligné sur son bord droit et
// ramené dans la fenêtre si besoin. Sous 640 px il s'affiche en tiroir en bas
// de l'écran — un menu flottant de 320 px n'a pas sa place sur un téléphone.
//
// Rendu via un portail (createPortal → document.body), pas simplement inline :
// `position: fixed` ne s'ancre à la fenêtre QUE si aucun ancêtre n'a de
// transform/filter/will-change (ça devient sinon relatif à cet ancêtre — ici,
// l'animation d'entrée `animate-[fadeInUp...]` de la page patients laisse un
// `transform` en place via `fill-mode: both`). Constaté en comparant
// `getBoundingClientRect()` au `style.left/top` posés par React : un écart de
// plusieurs centaines de pixels révélait cet ancêtre transformé. Le portail
// contourne le problème plutôt que de dépendre de ce qu'une page fait ou pas.
export default function PatientActionsMenu({
  patientId,
  patientName,
  paymentLapsedAt,
  paymentEligibleForDeletion,
  redirectTo,
  markPaymentLapsed,
  clearPaymentLapsed,
  deletePatient,
  trigger = "button",
}: {
  patientId: string;
  patientName: string;
  paymentLapsedAt: string | null;
  /** `paymentLapsedAt` + 3 mois est déjà passé — calculé côté serveur. */
  paymentEligibleForDeletion: boolean;
  redirectTo: string;
  markPaymentLapsed: (formData: FormData) => Promise<void>;
  clearPaymentLapsed: (formData: FormData) => Promise<void>;
  deletePatient: (formData: FormData) => Promise<void>;
  /** "button" (default) = la pill « Gérer » de la fiche patient. "icon" = un
   *  bouton compact (mêmes dimensions que le bouton Messages) pour une ligne
   *  de tableau/liste. */
  trigger?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [layout, setLayout] = useState<{ sheet: boolean; top: number; left: number }>({ sheet: false, top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const next =
        window.innerWidth < SHEET_BREAKPOINT
          ? { sheet: true, top: 0, left: 0 }
          : (() => {
              const rect = trigger.getBoundingClientRect();
              return {
                sheet: false,
                top: Math.round(rect.bottom + 8),
                left: Math.round(Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))),
              };
            })();
      // Ne re-rend que si la position change vraiment — un setState
      // inconditionnel ici peut s'emballer avec les événements de layout.
      setLayout((prev) => (prev.sheet === next.sheet && prev.top === next.top && prev.left === next.left ? prev : next));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const lapsedDate = paymentLapsedAt ? new Date(paymentLapsedAt) : null;
  const eligibleDate = lapsedDate ? new Date(lapsedDate) : null;
  if (eligibleDate) eligibleDate.setMonth(eligibleDate.getMonth() + 3);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const itemClass =
    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-app-bg focus-visible:bg-app-bg focus-visible:outline-none";

  const panel = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Gérer ${patientName}`}
      style={layout.sheet ? undefined : { top: layout.top, left: layout.left, width: MENU_WIDTH }}
      className={
        layout.sheet
          ? "fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-line bg-surface p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-xl"
          : "fixed z-40 rounded-2xl border border-line bg-surface p-2 shadow-xl"
      }
    >
      <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-1.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{patientName}</p>
          <p className="text-xs text-muted">
            {lapsedDate ? (
              <span className="text-warn">Ne paie plus depuis le {fmt(lapsedDate)}</span>
            ) : (
              "Suivi actif, paiement à jour"
            )}
          </p>
        </div>
        {layout.sheet && (
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1.5 text-muted hover:bg-app-bg hover:text-ink">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <div className="border-t border-line pt-1.5">
        {lapsedDate ? (
          <form action={clearPaymentLapsed}>
            <input type="hidden" name="patient_id" value={patientId} />
            <input type="hidden" name="redirect_to" value={redirectTo} />
            <button type="submit" role="menuitem" className={itemClass}>
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
              <span>
                <span className="block text-sm font-medium text-ink">Marquer comme payant à nouveau</span>
                <span className="block text-xs text-muted">Le suivi reprend normalement.</span>
              </span>
            </button>
          </form>
        ) : (
          <form action={markPaymentLapsed}>
            <input type="hidden" name="patient_id" value={patientId} />
            <input type="hidden" name="redirect_to" value={redirectTo} />
            <button type="submit" role="menuitem" className={itemClass}>
              <BadgeEuro className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
              <span>
                <span className="block text-sm font-medium text-ink">Marquer comme ne payant plus</span>
                <span className="block text-xs text-muted">Sans effet sur ses données ; suppression possible après 3 mois.</span>
              </span>
            </button>
          </form>
        )}
      </div>

      <div className="mt-1.5 border-t border-line pt-1.5">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            setConfirming(true);
          }}
          className={`${itemClass} hover:bg-danger-soft focus-visible:bg-danger-soft`}
        >
          <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-danger" strokeWidth={1.75} />
          <span>
            <span className="block text-sm font-medium text-danger">Supprimer ce patient</span>
            <span className="block text-xs text-muted">
              {lapsedDate
                ? paymentEligibleForDeletion
                  ? `Possible depuis le ${fmt(eligibleDate!)}.`
                  : `Conseillé à partir du ${fmt(eligibleDate!)}.`
                : "Efface définitivement son historique et ses messages."}
            </span>
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={trigger === "icon" ? `Gérer ${patientName}` : undefined}
        title={trigger === "icon" ? "Gérer" : undefined}
        className={
          trigger === "icon"
            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-app-bg hover:text-ink"
            : "inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg"
        }
      >
        {trigger === "icon" ? (
          <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <>
            <Settings2 className="h-4 w-4" strokeWidth={1.75} />
            Gérer
          </>
        )}
      </button>

      {typeof document !== "undefined" &&
        open &&
        createPortal(
          <>
            {layout.sheet && <div className="fixed inset-0 z-30 bg-ink/30" onClick={() => setOpen(false)} />}
            {panel}
          </>,
          document.body,
        )}

      {typeof document !== "undefined" &&
        confirming &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={() => setConfirming(false)}>
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label={`Supprimer ${patientName}`}
              className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
                <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h2 className="mt-3 text-lg font-semibold text-ink">Supprimer {patientName} ?</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Cette action efface définitivement son historique de séances, son profil et ses messages. Son adresse
                e-mail redevient libre pour une nouvelle invitation, si besoin.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg"
                >
                  Annuler
                </button>
                <form action={deletePatient}>
                  <input type="hidden" name="patient_id" value={patientId} />
                  <button type="submit" className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                    Supprimer définitivement
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
