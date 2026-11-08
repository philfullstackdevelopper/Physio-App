"use client";

// Vidéo filmée par un kiné pour SON exercice (Philippe, 2026-11-04) : le
// fichier part directement du téléphone vers le stockage des vidéos
// (Cloudflare R2), avec une adresse d'envoi signée fournie par le serveur
// (app/dashboard/exercises/actions.ts). Utilisé par le formulaire de création
// (NewExerciseWizard) et par la fiche d'un exercice dans « Mes exercices ».

import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { getKineVideoUploadUrl, saveKineExerciseVideo } from "@/app/dashboard/exercises/actions";
import { KINE_VIDEO_MAX_MB, KINE_VIDEO_TYPES } from "@/lib/exercise/kineExercises";

/** Traducteur « exercise.kineVideo » (useTranslations) ; absent = français. */
type Tr = (key: string, values?: Record<string, string | number>) => string;

/** Envoie `file` puis l'attache à l'exercice. Lève une Error lisible. */
export async function uploadKineVideo(
  exerciseId: string,
  file: File,
  consent: boolean,
  onProgress?: (percent: number) => void,
  t?: Tr,
): Promise<void> {
  const type = videoType(file);
  const target = await getKineVideoUploadUrl(exerciseId, type, file.size);
  if ("error" in target) throw new Error(target.error);
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", target.uploadUrl);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(t ? t("refused", { status: xhr.status }) : `Envoi refusé (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error(t ? t("interrupted") : "Envoi interrompu. Vérifiez votre connexion et réessayez."));
    xhr.send(file);
  });
  const saved = await saveKineExerciseVideo(exerciseId, target.key, consent);
  if ("error" in saved) throw new Error(saved.error);
}

/** Type de la vidéo : certains téléphones laissent file.type vide. */
export function videoType(file: File): string {
  if (file.type && KINE_VIDEO_TYPES[file.type]) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "mov") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  return file.type || "video/mp4";
}

/** Le fichier choisi est-il acceptable ? Renvoie le message d'erreur, sinon null. */
export function checkVideoFile(file: File, t?: Tr): string | null {
  if (!KINE_VIDEO_TYPES[videoType(file)]) return t ? t("badFormat") : "Format non pris en charge : choisissez une vidéo MP4 ou MOV.";
  if (file.size > KINE_VIDEO_MAX_MB * 1024 * 1024) {
    if (t) return t("tooBig", { size: Math.round(file.size / 1024 / 1024), max: KINE_VIDEO_MAX_MB });
    return `Vidéo trop lourde (${Math.round(file.size / 1024 / 1024)} Mo, ${KINE_VIDEO_MAX_MB} Mo au plus). Raccourcissez-la à 20 secondes environ.`;
  }
  return null;
}

/** Conseils de tournage (Philippe, 2026-11-04 : « inciter à garder la caméra
 *  bien stable et fixe »). */
export function FilmingTips({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("exercise.kineVideo");
  const b = (c: React.ReactNode) => <b>{c}</b>;
  return (
    <div className="rounded-xl border border-brand/30 bg-brand-soft p-3 text-sm text-ink">
      <p className="font-semibold text-brand">{t("tipsTitle")}</p>
      <ul className={`mt-1.5 list-disc space-y-0.5 pl-5 ${compact ? "text-xs" : "text-[13px]"}`}>
        <li>{t.rich("tip1", { b })}</li>
        <li>{t("tip2")}</li>
        <li>{t("tip3")}</li>
        <li>{t("tip4")}</li>
      </ul>
    </div>
  );
}

/** Bouton « Ajouter / Remplacer la vidéo » de la fiche d'un exercice du kiné. */
export default function KineVideoUpload({
  exerciseId,
  hasVideo,
  onUploaded,
}: {
  exerciseId: string;
  hasVideo: boolean;
  onUploaded?: () => void;
}) {
  const t = useTranslations("exercise.kineVideo");
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  const choose = (f: File | undefined) => {
    setError(null);
    setDone(false);
    if (!f) return;
    const problem = checkVideoFile(f, t);
    if (problem) {
      setError(problem);
      return;
    }
    setFile(f);
  };

  const send = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadKineVideo(exerciseId, file, consent, setProgress, t);
      setDone(true);
      setFile(null);
      setConsent(false);
      onUploaded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("sendImpossible"));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {!file ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            <Camera className="h-4 w-4" strokeWidth={2} />
            {hasVideo ? t("refilm") : t("film")}
          </button>
          <button
            type="button"
            onClick={() => pickRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-app-bg"
          >
            <Upload className="h-4 w-4" strokeWidth={2} />
            {hasVideo ? t("replace") : t("choose")}
          </button>
          <input ref={cameraRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
          <input ref={pickRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink">
            {t.rich("chosen", { name: file.name, size: Math.max(1, Math.round(file.size / 1024 / 1024)), b: (c) => <b>{c}</b> })}
          </p>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-brand" />
            <span>
              {t.rich("consent", { b: (c) => <b>{c}</b> })}
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!consent || busy}
              onClick={send}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? t("sendingProgress", { progress }) : t("send")}
            </button>
            <button type="button" disabled={busy} onClick={() => setFile(null)} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-ink">
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
      {done && <p className="text-sm text-ok">{t("sent")}</p>}
      {error && <p className="rounded-lg bg-danger-soft p-2 text-sm text-danger">{error}</p>}
      <FilmingTips compact />
    </div>
  );
}
