"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, MessageCircle, MoreVertical, Settings2, Trash2, UserRound, X } from "lucide-react";
import PatientMessagesModal, { type MessagesModalPatient } from "@/components/PatientMessagesModal";
import type { ThreadMessage } from "@/components/MessageThread";
import { isPhoneFormat } from "@/lib/phoneFormat";

const MENU_WIDTH = 320;

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
  lapseReason = null,
  deletePatient,
  trigger = "button",
  messages,
  conditionSlot,
  conditionMissing = false,
  profileSlot,
}: {
  patientId: string;
  patientName: string;
  /** Depuis quand son abonnement ne lui donne plus accès (calculé d'après
   *  Stripe, lib/patient/paymentStatus.ts) — null = pas un ancien patient. */
  paymentLapsedAt: string | null;
  /** `paymentLapsedAt` + 3 mois est déjà passé — calculé côté serveur. */
  paymentEligibleForDeletion: boolean;
  /** Carte refusée ou abonnement terminé (même règle que le cadenas patient). */
  lapseReason?: "payment_failed" | "ended" | null;
  redirectTo: string;
  deletePatient: (formData: FormData) => Promise<void>;
  /** "button" (default) = la pill « Gérer » de la fiche patient. "icon" = un
   *  bouton compact (mêmes dimensions que le bouton Messages) pour une ligne
   *  de tableau/liste. */
  trigger?: "button" | "icon";
  /** Fiche patient uniquement (Philippe, 2026-10-01 : en-tête épuré, tout le
   *  reste passe dans « Gérer ») — la conversation, ouverte en popup. */
  messages?: {
    patient: MessagesModalPatient;
    unreadCount: number;
    getThread: (patientId: string) => Promise<{ thread: ThreadMessage[] } | { error: string }>;
    sendMessage: (formData: FormData) => Promise<{ ok: true } | { error: string }>;
  };
  /** Le formulaire « Condition » (ConditionSelect dans son <form>), rendu tel quel. */
  conditionSlot?: ReactNode;
  /** Le patient n'a pas encore de condition (Philippe, 2026-10-01) : pastille
   *  « ! » sur « Gérer », et le bloc Condition s'encadre et tremble à
   *  l'ouverture pour que le kiné voie qu'il doit la renseigner. */
  conditionMissing?: boolean;
  /** Le contenu « Profil déclaré », affiché dans une petite fenêtre. */
  profileSlot?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const unread = messages?.unreadCount ?? 0;
  const [layout, setLayout] = useState<{ sheet: boolean; top: number; left: number }>({ sheet: false, top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const next =
        isPhoneFormat()
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

  // Sur téléphone, une courte vibration accompagne le tremblement du bloc
  // Condition (sans effet sur ordinateur / navigateurs qui ne la gèrent pas).
  useEffect(() => {
    if (!open || !conditionMissing || !conditionSlot) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate?.([60, 40, 60]);
  }, [open, conditionMissing, conditionSlot]);

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
          ? "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-line bg-surface p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-xl"
          : "fixed z-40 rounded-2xl border border-line bg-surface p-2 shadow-xl"
      }
    >
      <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-1.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{patientName}</p>
          <p className="text-xs text-muted">
            {lapsedDate ? (
              <span className="text-warn">
                {lapseReason === "payment_failed" ? "Paiement refusé" : "Abonnement terminé"} depuis le {fmt(lapsedDate)} — accès verrouillé
              </span>
            ) : (
              "Suivi actif"
            )}
          </p>
        </div>
        {layout.sheet && (
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1.5 text-muted hover:bg-app-bg hover:text-ink">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {(messages || profileSlot) && (
        <div className="border-t border-line py-1.5">
          {messages && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setMessagesOpen(true);
              }}
              className={`${itemClass} items-center`}
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
              <span className="flex-1 text-sm font-medium text-ink">Messages</span>
              {unread > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] font-medium text-white">{unread}</span>}
            </button>
          )}
          {profileSlot && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setProfileOpen(true);
              }}
              className={`${itemClass} items-center`}
            >
              <UserRound className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
              <span className="text-sm font-medium text-ink">Profil déclaré</span>
            </button>
          )}
        </div>
      )}

      {conditionSlot && (
        <div className="border-t border-line px-3 py-2.5">
          {conditionMissing ? (
            // Encadré orange + deux tremblements à l'ouverture (rejoués à
            // chaque ouverture : le bloc est remonté avec le menu).
            <div className="rounded-xl bg-warn-soft p-2.5 ring-2 ring-warn motion-safe:animate-[nudgeShake_0.6s_ease-in-out_0.2s_2]">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-warn">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                Condition à renseigner
              </p>
              <p className="mb-2 text-xs text-ink/80">Choisissez la pathologie suivie pour {patientName}.</p>
              {conditionSlot}
            </div>
          ) : (
            <>
              <p className="mb-1.5 text-xs font-medium text-muted">Condition</p>
              {conditionSlot}
            </>
          )}
        </div>
      )}

      {/* Plus d'étiquette manuelle « ne paie plus » (Philippe, 2026-10-10) : le
          statut vient de Stripe, tout seul — voir la ligne sous le nom. */}
      <div className="border-t border-line pt-1.5">
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
                : "Efface définitivement son historique, ses messages et son identifiant de connexion."}
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
        aria-label={
          trigger === "icon" ? `Gérer ${patientName}` : conditionMissing && conditionSlot ? "Gérer — condition à renseigner" : undefined
        }
        title={trigger === "icon" ? "Gérer" : conditionMissing && conditionSlot ? "Condition à renseigner" : undefined}
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
            {/* Messages non lus : visibles sans ouvrir le menu. */}
            {unread > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] text-white">{unread}</span>}
            {/* Condition manquante : pastille orange, distincte du compteur
                de messages (bleu). */}
            {conditionMissing && conditionSlot && (
              <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full bg-warn text-[11px] font-bold leading-none text-white">
                !
              </span>
            )}
          </>
        )}
      </button>

      {typeof document !== "undefined" &&
        open &&
        createPortal(
          <>
            {layout.sheet && <div className="fixed inset-0 z-[45] bg-ink/30" onClick={() => setOpen(false)} />}
            {panel}
          </>,
          document.body,
        )}

      {messages && messagesOpen && (
        <PatientMessagesModal
          patient={messages.patient}
          onClose={() => setMessagesOpen(false)}
          getThread={messages.getThread}
          sendMessage={messages.sendMessage}
        />
      )}

      {typeof document !== "undefined" &&
        profileOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={() => setProfileOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Profil déclaré de ${patientName}`}
              className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-ink">Profil déclaré de {patientName}</h2>
                <button type="button" onClick={() => setProfileOpen(false)} aria-label="Fermer" className="rounded-lg p-1 text-muted hover:bg-app-bg hover:text-ink">
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              <div className="mt-3">{profileSlot}</div>
            </div>
          </div>,
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
