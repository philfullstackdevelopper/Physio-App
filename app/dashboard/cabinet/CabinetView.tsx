"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Building2, Check, Clock, LogOut, Search, Share2, UserMinus, X } from "lucide-react";
import { initials } from "@/lib/format/initials";
import type { CabinetSearchResult, CabinetView as CabinetViewData } from "@/lib/db/cabinets";
import {
  createCabinetAction,
  decideRequestAction,
  leaveCabinetAction,
  removeMemberAction,
  requestJoinAction,
  searchCabinetsAction,
  type CabinetActionResult,
} from "./actions";

const field =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft";
const card = "rounded-2xl border border-line bg-surface p-5 max-sm:p-4";

export default function CabinetView({
  meId,
  view,
  suggestedName,
  suggestedAddress,
}: {
  meId: string;
  view: CabinetViewData | null;
  suggestedName: string;
  suggestedAddress: string;
}) {
  const t = useTranslations("dashboard.cabinet");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const run = (fn: () => Promise<CabinetActionResult>) =>
    start(async () => {
      const res = await fn();
      setMessage(res.error ?? null);
      if (res.ok) router.refresh();
    });

  return (
    <main>
      <div className="mx-auto max-w-4xl p-5 max-sm:p-4 max-sm:pt-2">
        <h1 className="text-xl font-semibold text-ink max-sm:text-2xl">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("intro")}</p>
        {message && (
          <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {message}
          </p>
        )}
        <div className="mt-5">
          {!view ? (
            <NoCabinet suggestedName={suggestedName} suggestedAddress={suggestedAddress} pending={pending} run={run} />
          ) : view.me.status === "pending" ? (
            <PendingRequest name={view.cabinet.name} pending={pending} run={run} />
          ) : (
            <MyCabinet meId={meId} view={view} pending={pending} run={run} />
          )}
        </div>
      </div>
    </main>
  );
}

type Run = (fn: () => Promise<CabinetActionResult>) => void;

function NoCabinet({ suggestedName, suggestedAddress, pending, run }: { suggestedName: string; suggestedAddress: string; pending: boolean; run: Run }) {
  const t = useTranslations("dashboard.cabinet");
  const tc = useTranslations("auth.cabinet");
  const [query, setQuery] = useState(suggestedName);
  const [results, setResults] = useState<CabinetSearchResult[] | null>(null);

  useEffect(() => {
    const q = query.trim();
    // Moins de 2 lettres : rien à chercher (la liste est masquée à l'affichage).
    if (q.length < 2) return;
    let live = true;
    const timer = setTimeout(async () => {
      const found = await searchCabinetsAction(q).catch(() => []);
      if (live) setResults(found);
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className={card} aria-labelledby="cab-join">
        <h2 id="cab-join" className="font-semibold text-ink">{t("joinTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("joinHelp")}</p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tc("searchPlaceholder")}
            aria-label={tc("searchAria")}
            className={`${field} mt-0 pl-9`}
          />
        </div>
        {results && query.trim().length >= 2 && (
          <ul className="mt-3 flex flex-col gap-2" aria-live="polite">
            {results.length === 0 && <li className="text-sm text-muted">{tc("searchNone")}</li>}
            {results.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <Building2 className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{c.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {[c.postal_code, c.city].filter(Boolean).join(" ") || c.address}
                    {" · "}
                    {tc("kineCount", { count: c.members })}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => requestJoinAction(c.id))}
                  className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
                >
                  {tc("join")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card} aria-labelledby="cab-create">
        <h2 id="cab-create" className="font-semibold text-ink">{t("createTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("createHelp")}</p>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => createCabinetAction(fd));
          }}
        >
          <label className="text-sm font-medium text-ink">
            {tc("nameLabel")}
            <input name="name" required minLength={2} maxLength={120} defaultValue={suggestedName} placeholder={tc("namePlaceholder")} className={field} />
          </label>
          <label className="text-sm font-medium text-ink">
            {tc("addressLabel")}
            <input name="address" maxLength={300} defaultValue={suggestedAddress} placeholder={tc("addressPlaceholder")} className={field} />
          </label>
          <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50">
            {t("createButton")}
          </button>
        </form>
      </section>
    </div>
  );
}

function PendingRequest({ name, pending, run }: { name: string; pending: boolean; run: Run }) {
  const t = useTranslations("dashboard.cabinet");
  return (
    <section className={`${card} flex items-start gap-3`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn">
        <Clock className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-ink">{t("pendingTitle", { name })}</h2>
        <p className="mt-1 text-sm text-muted">{t("pendingHelp")}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => leaveCabinetAction())}
          className="mt-3 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-app-bg disabled:opacity-50"
        >
          {t("cancelRequest")}
        </button>
      </div>
    </section>
  );
}

function MyCabinet({ meId, view, pending, run }: { meId: string; view: CabinetViewData; pending: boolean; run: Run }) {
  const t = useTranslations("dashboard.cabinet");
  const format = useFormatter();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const iAmOwner = view.me.role === "owner";
  const active = view.members.filter((m) => m.status === "active");
  const requests = view.members.filter((m) => m.status === "pending");
  const where = [view.cabinet.address, [view.cabinet.postal_code, view.cabinet.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .filter((v, i, a) => !(i === 1 && a[0]?.includes(v as string)))
    .join(" · ");

  return (
    <div className="flex flex-col gap-4">
      <section className={`${card} flex items-start gap-3`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Building2 className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-ink">{view.cabinet.name}</h2>
          {where && <p className="text-sm text-muted">{where}</p>}
          <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
            <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
            <span>
              {t("shareHelp")}{" "}
              <Link href="/dashboard/exercises" className="font-medium text-brand hover:underline">
                {t("toExercises")}
              </Link>
            </span>
          </p>
        </div>
      </section>

      {requests.length > 0 && (
        <section className={card} aria-labelledby="cab-requests">
          <h2 id="cab-requests" className="font-semibold text-ink">
            {t("requestsTitle", { count: requests.length })}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("requestsHelp")}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {requests.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <Avatar name={m.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{m.name}</span>
                  <span className="block truncate text-xs text-muted">{m.email}</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => decideRequestAction(m.id, true))}
                    className="inline-flex items-center gap-1 rounded-lg bg-ok px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" strokeWidth={2} />
                    {t("accept")}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => decideRequestAction(m.id, false))}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-app-bg disabled:opacity-50"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                    {t("refuse")}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={card} aria-labelledby="cab-members">
        <h2 id="cab-members" className="font-semibold text-ink">
          {t("membersTitle", { count: active.length })}
        </h2>
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {active.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <Avatar name={m.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">
                  {m.name}
                  {m.id === meId && <span className="font-normal text-muted"> {t("you")}</span>}
                </span>
                <span className="block truncate text-xs text-muted">
                  {m.email}
                  {m.joined_at && <> · {t("since", { date: format.dateTime(new Date(m.joined_at), { day: "numeric", month: "long", year: "numeric" }) })}</>}
                </span>
              </span>
              {m.role === "owner" && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">{t("founder")}</span>}
              {iAmOwner && m.id !== meId && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => removeMemberAction(m.id))}
                  aria-label={t("removeAria", { name: m.name ?? "" })}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                >
                  <UserMinus className="h-4 w-4" strokeWidth={1.75} />
                  <span className="max-sm:hidden">{t("remove")}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap items-center gap-3 px-1">
        {!confirmLeave ? (
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-danger"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            {t("leave")}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            <span>{active.length <= 1 ? t("leaveLastConfirm") : t("leaveConfirm")}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => leaveCabinetAction())}
              className="rounded-lg bg-danger px-3 py-1 font-medium text-white disabled:opacity-50"
            >
              {t("leaveYes")}
            </button>
            <button type="button" onClick={() => setConfirmLeave(false)} className="rounded-lg px-2 py-1 font-medium text-ink">
              {t("leaveNo")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Avatar({ name }: { name: string | null }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
      {initials(name)}
    </span>
  );
}
