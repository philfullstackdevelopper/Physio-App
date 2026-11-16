"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { mergeCabinets } from "./actions";

// « Fusionner » un cabinet en double dans un autre (audit du 2026-11-16, C3) :
// on choisit le cabinet à garder, puis on CONFIRME en lisant ce qui va se
// passer — avant, un seul clic supprimait le doublon, sans retour en cas d'échec.
export default function MergeCabinetForm({
  source,
  options,
  defaultTarget,
}: {
  source: { id: string; name: string };
  options: { id: string; label: string; name: string }[];
  defaultTarget: string | null;
}) {
  const t = useTranslations("admin.cabinets");
  const router = useRouter();
  const [target, setTarget] = useState(defaultTarget ?? "");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const targetName = options.find((o) => o.id === target)?.name ?? "";

  return (
    <div className="mt-2 text-xs text-slate-600">
      {!confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            {t("mergeInto")}
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
            >
              <option value="" disabled>
                {t("chooseKept")}
              </option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!target}
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            className="rounded-lg border border-slate-300 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {t("merge")}
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <p>{t("confirm", { source: source.name, target: targetName })}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await mergeCabinets(source.id, target);
                  if ("error" in res) {
                    setError(res.error);
                    setConfirming(false);
                    return;
                  }
                  setConfirming(false);
                  router.refresh();
                })
              }
              className="rounded-lg bg-slate-900 px-3 py-1 font-medium text-white disabled:opacity-50"
            >
              {pending ? t("merging") : t("confirmYes")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1 font-medium">
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
