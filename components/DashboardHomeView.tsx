// Accueil du kiné — l'affichage seul, sans requête : app/dashboard/page.tsx
// charge les données, /prototypes/kine-telephone le rend avec des données
// fictives pour juger l'affichage téléphone sans se connecter.

import Link from "next/link";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronRight, Minus } from "lucide-react";
import type { DashboardHome, Tile } from "@/lib/dashboard/homeData";
import type { UnreadMessageRow } from "@/lib/dashboard/unreadMessages";
import { useTranslations } from "next-intl";
import { useLibI18n } from "@/lib/dashboard/useLibI18n";
import { relativeDay } from "@/lib/format/relativeDay";
import { initials } from "@/lib/format/initials";

// 4 lignes par colonne : au-delà, « Voir tout ». Avec ces limites l'accueil
// tient dans ~480 px de haut (PC de Philippe : 549 px utiles).
const TO_TREAT_LIMIT = 4;
const UNREAD_LIMIT = 4;
// Téléphone : lignes « À traiter » montrées sous les 4 cases (écran assez haut).
const PHONE_ROWS = 3;

// `bad` = la case compte quelque chose d'inquiétant (douleurs) : une hausse
// est alors rouge, une baisse verte — et à 0 rien d'alarmant, juste
// « aucune aujourd'hui » en gris (Philippe, 2026-11-08).
function Delta({ tile, bad = false }: { tile: Tile; bad?: boolean }) {
  const t = useTranslations("dashboard.home");
  if (bad && tile.value === 0) return <span className="flex items-center gap-1 text-xs text-muted">{t("noPainToday")}</span>;
  if (tile.delta === null) return null;
  if (tile.delta === 0) return <span className="flex items-center gap-1 text-xs text-muted"><Minus className="h-3 w-3" strokeWidth={2} />{t("sameAsYesterday")}</span>;
  const up = tile.delta > 0;
  return (
    <span className={`flex items-center gap-1 text-xs ${up !== bad ? "text-ok" : "text-danger"}`}>
      {up ? <ArrowUp className="h-3 w-3" strokeWidth={2} /> : <ArrowDown className="h-3 w-3" strokeWidth={2} />}
      {t("vsYesterday", { n: Math.abs(tile.delta) })}
    </span>
  );
}

// Une cellule de la barre d'indicateurs : valeur + libellé + écart sur une
// seule ligne (même principe que la barre de la fiche patient), pour que
// l'accueil tienne sur un écran sans scroller (Philippe, 2026-10-02).
// Rouge / orange seulement quand il y a vraiment quelque chose : un 0 reste
// gris neutre (Philippe, 2026-11-08 : « 0 Douleurs » en rouge alarmait).
function toneColor(value: number, tone: "ok" | "danger" | "warn" | "ink") {
  if (value === 0 && (tone === "danger" || tone === "warn")) return "text-muted";
  return { ok: "text-ok", danger: "text-danger", warn: "text-warn", ink: "text-ink" }[tone];
}

function StatTile({ value, label, tone, tile }: { value: number; label: string; tone: "ok" | "danger" | "warn" | "ink"; tile?: Tile }) {
  const color = toneColor(value, tone);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-3">
      <p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="text-sm text-ink">{label}</p>
      {tile && <Delta tile={tile} bad={tone === "danger"} />}
    </div>
  );
}

// Case carrée de la version téléphone (grille 2 × 2) — cartes blanches sans
// bordure, ombre douce, comme l'appli patient sur téléphone.
const PHONE_SQUARE = "flex aspect-square flex-col justify-between rounded-2xl bg-surface p-4 shadow-soft";
// Retour tactile des cases cliquables : elles s'enfoncent légèrement sous le doigt.
const PHONE_TAP = "transition-transform duration-150 active:scale-[0.97]";

function PhoneSquare({ value, label, tone, tile, href }: { value: number; label: string; tone: "ok" | "danger" | "warn" | "ink"; tile?: Tile; href?: string }) {
  const color = toneColor(value, tone);
  const inner = (
    <>
      <p className={`text-4xl font-semibold tabular-nums ${color}`}>{value}</p>
      <div>
        <p className="flex items-center gap-1 text-sm font-medium text-ink">
          {label}
          {href && <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />}
        </p>
        {tile && <div className="mt-0.5"><Delta tile={tile} bad={tone === "danger"} /></div>}
      </div>
    </>
  );
  return href ? <Link href={href} className={`${PHONE_SQUARE} ${PHONE_TAP}`}>{inner}</Link> : <div className={PHONE_SQUARE}>{inner}</div>;
}

// Aucun patient à traiter : un état calme plutôt qu'un vide (Philippe,
// 2026-11-08) — coche verte, « Rien à signaler », une ligne en gris.
function CalmState({ phone = false }: { phone?: boolean }) {
  const t = useTranslations("dashboard.home");
  return (
    <div className={`flex items-center gap-3 ${phone ? "rounded-2xl bg-surface px-4 py-4 shadow-soft" : "rounded-xl bg-app-bg px-3 py-3"}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
        <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{t("calmTitle")}</span>
        <span className="block text-sm text-muted">{phone ? t("calmBodyShort") : t("calmBody")}</span>
      </span>
    </div>
  );
}

export default function DashboardHomeView({ h, unreadRows }: { h: DashboardHome; unreadRows: UnreadMessageRow[] }) {
  const t = useTranslations("dashboard.home");
  const i18n = useLibI18n();
  const nothingToFollow = unreadRows.length === 0 && h.toTreat.length === 0;

  return (
    <main className="min-h-screen max-sm:min-h-0">
      <div className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-8 sm:py-6">
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-baseline justify-between gap-2 max-sm:flex-col max-sm:gap-0.5">
          <h1 className="text-2xl font-semibold text-ink">{t("hello", { name: h.firstName })}</h1>
          <p className="text-sm text-muted first-letter:uppercase sm:first-letter:normal-case">{h.todayLabel}</p>
        </div>

        {/* Téléphone : 4 cases carrées en 2 × 2, sans scroller (Philippe,
            2026-10-02). La 4e case résume les patients à suivre et ouvre la
            liste filtrée ; la barre et les listes ci-dessous sont réservées
            aux écrans plus larges. */}
        <section aria-label={t("today")} className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-4 grid grid-cols-2 gap-3 sm:hidden">
          <PhoneSquare value={h.sessionsToday.value} label={t("sessionsToday")} tone="ok" tile={h.sessionsToday} />
          <PhoneSquare value={h.painToday.value} label={t("painReports")} tone="danger" tile={h.painToday} />
          <PhoneSquare value={h.patientCount} label={t("patientsFollowed")} tone="ink" href="/dashboard/patients" />
          <Link
            href="/dashboard/patients?filtre=surveiller"
            className={`flex aspect-square flex-col justify-between rounded-2xl p-4 shadow-soft transition-[color,background-color,transform] duration-150 active:scale-[0.97] ${
              h.surveillerCount > 0 ? "bg-warn-soft" : "bg-surface"
            }`}
          >
            <p className={`text-4xl font-semibold tabular-nums ${h.surveillerCount > 0 ? "text-warn" : "text-ink"}`}>{h.surveillerCount}</p>
            <div>
              <p className="flex items-center gap-1 text-sm font-medium text-ink">
                {t("toFollow")} <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2} />
              </p>
              {unreadRows.length > 0 && (
                <p className="mt-0.5 text-xs text-muted">
                  {t("unreadCount", { count: unreadRows.length })}
                </p>
              )}
            </div>
          </Link>
        </section>

        {/* Téléphone assez haut (≥ 760 px) : sous les 4 cases, ce qui demande
            une action — les mêmes lignes que sur ordinateur, 3 au plus — pour
            ouvrir la bonne fiche en un appui (Philippe, 2026-10-10 : parcours
            « propre et agréable »). Sur un petit téléphone, rien de plus : la
            4e case mène déjà à la liste, et l'écran ne doit pas défiler. */}
        <section
          aria-label={t("toTreat")}
          className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:200ms] mt-5 hidden max-sm:[@media(min-height:760px)]:block"
        >
          {h.toTreat.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-ink">{t("toTreat")}</h2>
                {/* Sans le nombre : la 4e case l'affiche déjà (Philippe, 2026-11-06 : audit, on allège). */}
                <Link href="/dashboard/patients?filtre=surveiller" className="text-xs font-medium text-brand">
                  {t("seeAll")}
                </Link>
              </div>
              <ul className="mt-2 overflow-hidden rounded-2xl bg-surface shadow-soft">
                {h.toTreat.slice(0, PHONE_ROWS).map((r) => (
                  <li key={r.id} className="border-b border-line/70 last:border-b-0">
                    <Link href={`/dashboard/patients/${r.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-app-bg">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${r.kind === "pain" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
                        {r.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                        <span className={`block truncate text-xs ${r.kind === "pain" ? "text-danger" : "text-warn"}`}>{r.label}</span>
                      </span>
                      {r.score !== null && <span className="text-sm font-semibold tabular-nums text-danger">{r.score}/10</span>}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : unreadRows.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-ink">{t("unreadMessages")}</h2>
                <Link href="/dashboard/messages" className="text-xs font-medium text-brand">{t("seeAll")}</Link>
              </div>
              <ul className="mt-2 overflow-hidden rounded-2xl bg-surface shadow-soft">
                {unreadRows.slice(0, PHONE_ROWS).map((m) => (
                  <li key={m.patientId} className="border-b border-line/70 last:border-b-0">
                    <Link href={`/dashboard/messages?patient=${m.patientId}`} className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-app-bg">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                        {initials(m.patientName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{m.patientName}</span>
                        <span className="block truncate text-xs text-muted">{m.body}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <CalmState phone />
          )}
        </section>

        {/* 1 — Aujourd'hui : les chiffres du jour, en une barre fine. */}
        <section
          aria-label={t("today")}
          className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-4 hidden divide-line rounded-xl border border-line bg-surface sm:grid sm:grid-cols-3 sm:divide-x"
        >
          <StatTile value={h.sessionsToday.value} label={t("sessionsToday")} tone="ok" tile={h.sessionsToday} />
          <StatTile value={h.painToday.value} label={t("painReports")} tone="danger" tile={h.painToday} />
          <StatTile value={h.patientCount} label={t("patientsFollowed")} tone="ink" />
        </section>

        {/* 2 — Patients à suivre : ce qui demande une action, priorité clinique
            d'abord. « À traiter » et « Messages non lus » côte à côte dès lg. */}
        <section className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:200ms] mt-4 hidden rounded-xl border border-line bg-surface p-5 sm:block">
          <h2 className="text-lg font-semibold text-ink">{t("toFollow")}</h2>

          {nothingToFollow ? (
            <div className="mt-3"><CalmState /></div>
          ) : (
            // minmax(0,1fr) : sans lui, une ligne longue élargissait la colonne
            // au-delà de l'écran sur iPad en portrait (audit 2026-10-10).
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {h.toTreat.length === 0 && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{t("toTreat")}</h3>
                  <div className="mt-2"><CalmState /></div>
                </div>
              )}
              {h.toTreat.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{t("toTreat")}</h3>
                    {h.surveillerCount > TO_TREAT_LIMIT && (
                      <Link href="/dashboard/patients?filtre=surveiller" className="text-xs font-medium text-brand hover:underline">
                        {t("seeAllCount", { count: h.surveillerCount })}
                      </Link>
                    )}
                  </div>
                  <ul className="mt-2 space-y-2">
                    {h.toTreat.slice(0, TO_TREAT_LIMIT).map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/dashboard/patients/${r.id}`}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                            r.kind === "pain" ? "border-danger-soft bg-danger-soft hover:border-danger/30" : "border-line bg-app-bg hover:bg-line"
                          }`}
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${r.kind === "pain" ? "bg-surface text-danger" : "bg-warn-soft text-warn"}`}>
                            {r.initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                              {r.severe && <span className="h-1.5 w-1.5 rounded-full bg-danger animate-[gentlePulse_2.4s_ease-in-out_infinite]" title={t("severe")} />}
                              {r.name}
                            </span>
                            <span className={`block text-xs ${r.kind === "pain" ? "text-danger" : "text-warn"}`}>{r.label}</span>
                          </span>
                          {r.score !== null && <span className="text-sm font-semibold tabular-nums text-danger">{r.score}/10</span>}
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {unreadRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{t("unreadMessages")}</h3>
                    {unreadRows.length > UNREAD_LIMIT && (
                      <Link href="/dashboard/messages" className="text-xs font-medium text-brand hover:underline">
                        {t("seeAll")}
                      </Link>
                    )}
                  </div>
                  <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                    {unreadRows.slice(0, UNREAD_LIMIT).map((m) => (
                      <li key={m.patientId}>
                        <Link
                          href={`/dashboard/messages?patient=${m.patientId}`}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-app-bg"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                            {initials(m.patientName)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-ink">{m.patientName}</span>
                            <span className="block truncate text-xs text-muted">{m.body}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted">{relativeDay(m.createdAt, undefined, i18n)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* « Activité récente » retirée (Philippe, 2026-10-02) : l'accueil doit
            tenir sur un écran, sans scroller — on garde les indicateurs du
            jour et les patients à suivre. */}
      </div>
    </main>
  );
}
