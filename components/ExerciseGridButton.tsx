"use client";

// « Suivi par exercice » (Philippe, 2026-11-02, option C validée) : bouton de
// la fiche patient qui ouvre le tableau exercice × séance — la douleur de
// chaque exercice à chaque séance, « P » quand il a été passé, et une tendance.
// Dans une fenêtre pour que la fiche tienne toujours sur un écran.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Table2, X } from "lucide-react";
import type { ExerciseGrid, GridCell } from "@/lib/dashboard/exerciseGrid";

function cellClass(c: GridCell): string {
  if (!c) return "bg-app-bg text-muted/60";
  if (c.status === "skipped") return "border border-dashed border-warn bg-surface text-warn";
  if (c.pain == null) return "bg-app-bg text-muted";
  if (c.pain >= 6) return "bg-danger-soft text-danger";
  if (c.pain >= 4) return "bg-warn-soft text-warn";
  if (c.pain >= 1) return "bg-brand-soft text-brand-dark";
  return "bg-app-bg text-muted";
}

const TREND_CLASS = { up: "text-danger", down: "text-ok", skip: "text-warn", flat: "text-muted", new: "text-muted" } as const;

export default function ExerciseGridButton({ grid, patientName }: { grid: ExerciseGrid; patientName: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (grid.sessions.length === 0) return null;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink hover:bg-app-bg max-sm:px-2 max-sm:py-0.5 max-sm:text-[11px]"
      >
        <Table2 className="h-3.5 w-3.5" strokeWidth={2} />
        Suivi par exercice
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 max-sm:p-0" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Suivi par exercice — ${patientName}`}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-surface shadow-xl max-sm:h-dvh max-sm:max-h-none max-sm:rounded-none"
            >
              <div className="flex items-center gap-3 border-b border-line px-6 py-4 max-sm:px-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-ink">Suivi par exercice</h2>
                  <p className="text-xs text-muted">Douleur donnée par {patientName} à chaque séance ({grid.sessions.length} dernière{grid.sessions.length > 1 ? "s" : ""})</p>
                </div>
                <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-muted hover:bg-app-bg hover:text-ink">
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto px-6 py-4 max-sm:px-4">
                <div
                  className="grid min-w-[640px] items-center gap-1.5"
                  style={{ gridTemplateColumns: `minmax(180px, 1.6fr) repeat(${grid.sessions.length}, minmax(40px, 1fr)) 130px` }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Exercice</span>
                  {grid.sessions.map((s, i) => (
                    <span key={s.logId} className={`text-center text-[11px] tabular-nums ${i === grid.sessions.length - 1 ? "font-bold text-ink" : "text-muted"}`}>
                      {fmt(s.completedAt)}
                    </span>
                  ))}
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Tendance</span>

                  {grid.rows.map((row) => (
                    <div key={row.name} className="contents">
                      <span className="truncate text-sm text-ink" title={row.name}>{row.name}</span>
                      {row.cells.map((c, i) => (
                        <span
                          key={i}
                          className={`flex h-8 items-center justify-center rounded-lg text-xs font-semibold tabular-nums ${cellClass(c)}`}
                          title={c ? (c.status === "skipped" ? "Passé" : c.pain != null ? `Douleur ${c.pain}/10` : "Fait, douleur non donnée") : "Pas dans cette séance"}
                        >
                          {c ? (c.status === "skipped" ? "P" : c.pain ?? "✓") : "—"}
                        </span>
                      ))}
                      <span className={`text-xs font-semibold ${TREND_CLASS[row.trend.tone]}`}>{row.trend.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-3 text-xs text-muted max-sm:px-4">
                <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-brand-soft" />1 à 3</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-warn-soft" />4 à 5</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-danger-soft" />6 et plus</span>
                <span className="flex items-center gap-1.5"><span className="flex h-3 w-5 items-center justify-center rounded border border-dashed border-warn text-[9px] text-warn">P</span>passé</span>
                <span className="ml-auto">« Ajuster la séance » propose des variantes plus faciles ou plus difficiles.</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
