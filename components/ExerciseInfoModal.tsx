"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import { signExerciseVideo, signFilmedVideoByName } from "@/lib/storage/video-actions";

// Fenêtre « démo d'un exercice » ouverte par le petit (i) des listes
// d'exercices du kiné (Philippe, 2026-10-10) : avant d'ajouter un exercice à
// une séance, voir à quoi il ressemble — le dessin animé, les consignes, et
// la vidéo de démonstration dès qu'elle existe (aucune n'est encore en ligne :
// la fenêtre montre alors le dessin seul, sans rien promettre).
//
// Les détails (consignes, vidéo) sont lus ici, à l'ouverture, par l'id de
// l'exercice : les listes n'ont que le nom, et toutes les charger d'avance
// pour un clic occasionnel alourdirait chaque fenêtre. La bibliothèque
// d'exercices est lisible par tout utilisateur connecté (CLAUDE.md §3).
type Details = { instructions: string | null; mediaUrl: string | null; startSeconds: number };

export default function ExerciseInfoModal({
  exercise,
  onClose,
  footer,
}: {
  exercise: { id: string; name: string };
  onClose: () => void;
  /** Contenu en bas de la fenêtre, ex. « Ajouter / Remplacer la vidéo » dans « Mes exercices ». */
  footer?: ReactNode;
}) {
  const t = useTranslations("exercise.info");
  // undefined = en cours de chargement ; null = lecture impossible.
  const [details, setDetails] = useState<Details | null | undefined>(undefined);
  const [videoFailed, setVideoFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("exercises")
      .select("instructions, media_url, media_start_seconds")
      .eq("id", exercise.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        // Vidéo chez Cloudflare R2 (« r2:… ») : le serveur fournit un lien signé.
        const raw = (data?.media_url as string | null) ?? null;
        // Le serveur relit la fiche lui-même (par l'id) : il ne signe jamais un
        // chemin envoyé par le navigateur.
        let mediaUrl = raw?.startsWith("r2:") ? await signExerciseVideo(exercise.id).catch(() => null) : raw;
        // Fiche illisible (démo, non connecté) ou lien non obtenu : la vidéo de
        // Jules retrouvée par le nom de l'exercice (Philippe, 2026-11-02 : le (i)
        // doit montrer la VRAIE vidéo, pas le dessin).
        if (!mediaUrl) mediaUrl = await signFilmedVideoByName(exercise.name).catch(() => null);
        if (cancelled) return;
        if ((error || !data) && !mediaUrl) return setDetails(null);
        setDetails({
          instructions: (data?.instructions as string | null) ?? null,
          mediaUrl,
          startSeconds: (data?.media_start_seconds as number | null) ?? 0,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [exercise.id, exercise.name]);

  // Échap ferme CETTE fenêtre seulement (pas celle de la séance derrière) ;
  // le focus va sur « Fermer » à l'ouverture.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const showVideo = !!details?.mediaUrl && !videoFailed;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("dialogAria", { name: exercise.name })}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(40rem,calc(100dvh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface shadow-xl [animation:popIn_0.25s_ease-out_both]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold leading-snug text-ink">{exercise.name}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-app-bg hover:text-ink"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-4">
          {/* La vidéo quand elle existe (et se charge), sinon le dessin animé. */}
          <div className="flex items-center justify-center overflow-hidden rounded-xl bg-app-bg">
            {showVideo ? (
              <video
                key={details!.mediaUrl!}
                src={details!.startSeconds > 0 ? `${details!.mediaUrl}#t=${details!.startSeconds}` : details!.mediaUrl!}
                controls
                autoPlay
                muted
                loop
                playsInline
                onError={() => setVideoFailed(true)}
                // Forme d'origine de la vidéo (verticale ou horizontale), sans
                // bandes noires : largeur et hauteur suivent le fichier.
                className="h-auto max-h-72 w-auto max-w-full rounded-xl"
              >
                <track kind="captions" />
              </video>
            ) : details === undefined ? (
              // Pendant le chargement : pas de dessin qui clignote avant la vidéo
              // (Philippe, 2026-11-01 : le (i) doit montrer la vidéo).
              <div className="flex h-56 w-full items-center justify-center text-sm text-muted">{t("loadingVideo")}</div>
            ) : (
              // Pas (encore) de vidéo pour cet exercice : le dessin, en secours.
              <ExerciseIllustration name={exercise.name} className="h-56 w-full p-4 text-brand" />
            )}
          </div>

          <div className="mt-4 text-sm leading-relaxed text-ink" aria-live="polite">
            {details === undefined ? (
              <p className="text-muted">{t("loadingInstructions")}</p>
            ) : details === null ? (
              <p className="text-muted">{t("instructionsFailed")}</p>
            ) : details.instructions ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("instructions")}</p>
                <p className="mt-1 whitespace-pre-line">{details.instructions}</p>
              </>
            ) : (
              <p className="text-muted">{t("noInstructions")}</p>
            )}
          </div>
          {footer && <div className="mt-4 border-t border-line pt-4">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
