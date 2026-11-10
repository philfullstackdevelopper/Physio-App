"use client";

// /admin — exercices créés par les kinés (Philippe, 2026-11-04, migration
// 0081). Deux files :
//   - « À vérifier » : les exercices proposés à tous ; Publier, Demander une
//     modification ou Garder privé (avec un message au kiné, qu'il lit dans la
//     fiche de l'exercice) ;
//   - « À dessiner » : chaque nouvel exercice, même privé, pour lui ajouter
//     une démo bleue ; « Dessin fait » le retire de la liste.
// Chaque ligne affiche depuis quand elle attend : une file qu'on ne vide pas
// est la raison pour laquelle wger a supprimé la sienne.

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { markExerciseSeenAction, reviewExerciseAction } from "./exerciseActions";
import { EXERCISE_EQUIPMENT_LABELS, isExerciseEquipmentId } from "@/lib/exercise/equipment";

export interface AdminKineExercise {
  id: string;
  name: string;
  instructions: string | null;
  equipment: string[];
  videoUrl: string | null;
  createdAt: string;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  forOnePatient: boolean;
  filmingConsentAt: string | null;
  seenAt: string | null;
  sourceName: string | null;
  bodyParts: string | null;
  author: string;
  authorEmail: string | null;
}

const STATUS: Record<string, string> = {
  private: "Privé",
  pending: "À vérifier",
  published: "Publié",
  changes_requested: "Modification demandée",
  declined: "Gardé privé",
};

function waited(iso: string | null): string {
  if (!iso) return "";
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `depuis ${hours} h`;
  const days = Math.round(hours / 24);
  return `depuis ${days} j`;
}

export default function KineExercises({ rows }: { rows: AdminKineExercise[] }) {
  const toReview = rows.filter((r) => r.status === "pending").sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
  const toDraw = rows.filter((r) => !r.seenAt && r.status !== "declined");
  const history = rows.filter((r) => r.reviewedAt).sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""));
  const [tab, setTab] = useState<"review" | "draw" | "history">(toReview.length > 0 ? "review" : "draw");
  const list = tab === "review" ? toReview : tab === "draw" ? toDraw : history;
  const [openId, setOpenId] = useState<string | null>(list[0]?.id ?? null);
  const open = list.find((r) => r.id === openId) ?? list[0] ?? null;

  const tabBtn = (key: typeof tab, label: string, count: number) => (
    <button
      type="button"
      onClick={() => {
        setTab(key);
        setOpenId(null);
      }}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
    >
      {label}
      {count > 0 && key !== "history" && (
        <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] text-white">{count}</span>
      )}
    </button>
  );

  return (
    <section id="exercices-kines" className="mb-4 scroll-mt-6">
      <h2 className="font-display text-xl font-semibold text-slate-900">Exercices des kinés</h2>
      <p className="mt-1 text-sm text-slate-500">
        Chaque exercice créé par un kiné arrive ici. Ceux qu&apos;il propose à tous attendent votre vérification ; les autres
        attendent seulement leur démo bleue (ajoutée dans le code, comme pour la banque).
      </p>
      <div className="mt-4 flex flex-wrap gap-1 border-b border-slate-200">
        {tabBtn("review", "À vérifier (public)", toReview.length)}
        {tabBtn("draw", "À dessiner (démo bleue)", toDraw.length)}
        {tabBtn("history", "Historique", history.length)}
      </div>

      {list.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          {tab === "review" ? "Aucun exercice à vérifier." : tab === "draw" ? "Aucun exercice en attente de dessin." : "Aucune vérification pour le moment."}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <ul className="flex flex-col gap-2">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  className={`w-full rounded-xl border p-3 text-left text-sm ${open?.id === r.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                >
                  <span className="block font-semibold text-slate-900">{r.name}</span>
                  <span className="block text-slate-500">{r.author}</span>
                  <span className="mt-0.5 block font-mono text-xs text-slate-400">
                    {tab === "review"
                      ? `en attente ${waited(r.submittedAt)}`
                      : tab === "draw"
                        ? `créé ${waited(r.createdAt)} · ${r.forOnePatient ? "pour un patient" : STATUS[r.status] ?? r.status}`
                        : `${STATUS[r.status] ?? r.status} · ${r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString("fr-FR") : ""}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {open && (
            <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                {open.videoUrl ? (
                  <video src={open.videoUrl} controls muted playsInline className="max-h-72 w-full rounded-xl bg-slate-900 object-contain sm:w-48" />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500 sm:w-48">Pas de vidéo</div>
                )}
                <div className="min-w-0 text-sm">
                  <p className="text-base font-semibold text-slate-900">{open.name}</p>
                  <p className="text-slate-500">
                    {open.bodyParts || "Zone non précisée"}
                    {open.equipment.length > 0 &&
                      ` · ${open.equipment.map((e) => (isExerciseEquipmentId(e) ? EXERCISE_EQUIPMENT_LABELS[e] : e)).join(", ")}`}
                  </p>
                  <p className="mt-1 text-slate-500">
                    Par {open.author}
                    {open.authorEmail ? ` (${open.authorEmail})` : ""}
                  </p>
                  {open.sourceName && <p className="mt-1 text-slate-500">Variante de : {open.sourceName}</p>}
                  <p className="mt-1 text-slate-500">
                    {open.videoUrl
                      ? open.filmingConsentAt
                        ? "Accord de la personne filmée : coché."
                        : "Vidéo reprise d'un exercice de la plateforme."
                      : ""}
                  </p>
                </div>
              </div>
              {open.instructions && <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{open.instructions}</p>}
              {open.reviewNote && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  <b>Votre dernier message :</b> {open.reviewNote}
                </p>
              )}

              {tab === "review" && (
                <form action={reviewExerciseAction} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={open.id} />
                  <p className="text-xs text-slate-500">
                    Avant de publier : la personne filmée a donné son accord, ce n&apos;est pas un doublon (ou c&apos;est une vraie
                    variante), et les consignes sont correctes sur le plan clinique.
                  </p>
                  <textarea
                    name="note"
                    rows={2}
                    placeholder="Message au kiné (obligatoire pour demander une modification ou garder privé)"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton name="decision" value="publish" pendingText="Publier" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                      Publier
                    </SubmitButton>
                    <SubmitButton name="decision" value="changes" pendingText="Demander une modification" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                      Demander une modification
                    </SubmitButton>
                    <SubmitButton name="decision" value="decline" pendingText="Garder privé" className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">
                      Garder privé
                    </SubmitButton>
                  </div>
                </form>
              )}

              {tab === "draw" && (
                <form action={markExerciseSeenAction} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="id" value={open.id} />
                  <input type="hidden" name="seen" value="1" />
                  <p className="text-xs text-slate-500">
                    Dessin à ajouter dans le code (public/exercise-illustrations, lib/exercise/illustrationMap.ts) sous le nom exact
                    « {open.name} ».
                  </p>
                  <SubmitButton pendingText="Dessin fait" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Dessin fait</SubmitButton>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
