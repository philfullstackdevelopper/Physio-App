"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, Mail } from "lucide-react";

// A patient can't self-register — they're invited by their kiné (see
// AGENTS.md §4) — so /signup/patient doesn't lead to a form at all: it
// explains why and hands over a ready-to-send message asking their kiné to
// register on EasyPhysio (Philippe, 2026-09-10, built from a reference mock:
// a mail-client-style card with a subject/recipient/body and two ways to act
// on it — open the patient's own mail app, or copy the text to paste
// anywhere).
const SUBJECT = "Invitation EasyPhysio – mon suivi de rééducation";
const BODY = `Bonjour,

J'aimerais utiliser EasyPhysio pour suivre mon programme de rééducation avec vous. Pourriez-vous créer votre compte sur EasyPhysio et m'inviter depuis votre espace ?

easyphysio.fr

Merci !`;

const MAILTO_HREF = `mailto:?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;

export default function PatientReferralMessage() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(BODY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, insecure context) —
      // the message block above stays selectable/copyable by hand either way.
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </div>

      <div className="space-y-2 border-b border-slate-100 px-5 py-3 text-sm">
        <p className="flex gap-2">
          <span className="w-10 shrink-0 text-slate-400">Objet</span>
          <span className="font-medium text-slate-800">{SUBJECT}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-slate-400">À :</span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            votre kiné
          </span>
        </p>
      </div>

      <div className="px-5 py-4 text-sm leading-relaxed text-slate-700">
        {BODY.split("\n").map((line, i) =>
          line ? (
            <p key={i}>
              {line === "easyphysio.fr" ? (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                  easyphysio.fr
                </span>
              ) : (
                line
              )}
            </p>
          ) : (
            <p key={i} className="h-3" />
          ),
        )}
      </div>

      <div className="space-y-2 p-5 pt-1">
        <a
          href={MAILTO_HREF}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <Mail className="h-4 w-4" strokeWidth={1.75} />
          Ouvrir mon e-mail
        </a>
        <button
          type="button"
          onClick={copy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={1.75} />}
          {copied ? "Message copié" : "Copier le message"}
        </button>
        {/* "Ouvrir mon e-mail" only works if the device has a default mail
            app configured — a bare click gives no feedback otherwise, which
            reads as broken rather than "nothing to open" (Philippe,
            2026-09-10). This is the fallback, always right below it. */}
        <p className="pt-0.5 text-center text-xs text-slate-400">
          Rien ne s&apos;ouvre ? Copiez le message et collez-le dans votre e-mail habituel.
        </p>
      </div>
    </div>
  );
}
