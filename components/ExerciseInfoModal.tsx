"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ExerciseIllustration from "@/components/ExerciseIllustration";

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
}: {
  exercise: { id: string; name: string };
  onClose: () => void;
}) {
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
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) return setDetails(null);
        setDetails({
          instructions: (data.instructions as string | null) ?? null,
          mediaUrl: (data.media_url as string | null) ?? null,
          startSeconds: (data.media_start_seconds as number | null) ?? 0,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [exercise.id]);

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
        aria-label={`Démonstration : ${exercise.name}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(40rem,calc(100dvh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface shadow-xl [animation:popIn_0.25s_ease-out_both]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold leading-snug text-ink">{exercise.name}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
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
                className="max-h-72 w-full bg-black object-contain"
              >
                <track kind="captions" />
              </video>
            ) : (
              <ExerciseIllustration name={exercise.name} className="h-56 w-full p-4 text-brand" />
            )}
          </div>

          <div className="mt-4 text-sm leading-relaxed text-ink" aria-live="polite">
            {details === undefined ? (
              <p className="text-muted">Chargement des consignes…</p>
            ) : details === null ? (
              <p className="text-muted">Les consignes de cet exercice n&apos;ont pas pu être chargées.</p>
            ) : details.instructions ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Consignes</p>
                <p className="mt-1 whitespace-pre-line">{details.instructions}</p>
              </>
            ) : (
              <p className="text-muted">Pas de consignes écrites pour cet exercice.</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
