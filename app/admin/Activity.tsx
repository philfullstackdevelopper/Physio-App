"use client";

import { useMemo, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import {
  KINE_STAGES,
  PATIENT_STAGES,
  daysSince,
  funnel,
  kineNeedsNudge,
  patientNeedsNudge,
  type ActivityLevel,
  type KineActivity,
  type PatientActivity,
} from "@/lib/activity/activity";
import { nudgeAll, nudgeOne, testDiscordAlert } from "./activityActions";

// /admin — « Activité » (Philippe, 2026-11-16). Comment les gens arrivent
// (parcours), qui utilise vraiment l'appli, et relance par notification de
// ceux qui décrochent. Les patients apparaissent sous un code (P-XXXX) et
// le nom de leur kiné : leur nom n'est pas utile ici.

const LEVEL: Record<ActivityLevel, { label: string; tone: string }> = {
  actif: { label: "Actif", tone: "bg-emerald-50 text-emerald-700" },
  ralentit: { label: "Ralentit", tone: "bg-amber-50 text-amber-800" },
  inactif: { label: "Inactif", tone: "bg-red-50 text-red-700" },
  pas_commence: { label: "Pas commencé", tone: "bg-slate-100 text-slate-600" },
};

const SUB: Record<string, string> = {
  trialing: "essai",
  active: "abonné",
  past_due: "paiement en retard",
  canceled: "résilié",
  unpaid: "impayé",
  incomplete: "carte à confirmer",
  incomplete_expired: "carte non confirmée",
  inactive: "sans abonnement",
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

function ago(v: string | null, now: Date): string {
  const d = daysSince(v, now);
  if (d === null) return "jamais";
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return "hier";
  return `il y a ${d} j`;
}

type Filter = "tous" | "relancer" | "inactifs" | "actifs";

export default function Activity({
  patients: allPatients,
  kines: allKines,
  nowIso,
  notice,
}: {
  patients: PatientActivity[];
  kines: KineActivity[];
  nowIso: string;
  notice: string | null;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [tab, setTab] = useState<"patients" | "kines">("patients");
  const [filter, setFilter] = useState<Filter>("tous");
  const [showTests, setShowTests] = useState(false);

  const patients = allPatients.filter((p) => showTests || !p.isTest);
  const kines = allKines.filter((k) => showTests || !k.isTest);
  const testCount = allPatients.filter((p) => p.isTest).length + allKines.filter((k) => k.isTest).length;

  const withProgramme = patients.filter((p) => p.stage === "programme" || p.stage === "seance");
  const active7 = patients.filter((p) => p.level === "actif");
  const sessions7 = patients.reduce((s, p) => s + p.sessions7d, 0);
  const new30 = patients.filter((p) => (daysSince(p.createdAt, now) ?? 99) <= 30).length;
  const activeKines = kines.filter((k) => k.status === "approved" && k.level === "actif").length;
  const approvedKines = kines.filter((k) => k.status === "approved").length;
  const notifiable = patients.filter((p) => p.notifiable).length;
  const toNudgeP = patients.filter(patientNeedsNudge);
  const toNudgeK = kines.filter(kineNeedsNudge);

  const tiles = [
    { value: `${active7.length} / ${withProgramme.length}`, label: "patients actifs (séance ≤ 7 j) / avec programme" },
    { value: sessions7, label: "séances faites ces 7 derniers jours" },
    { value: new30, label: "nouveaux patients (30 j)" },
    { value: `${activeKines} / ${approvedKines}`, label: "kinés venus ces 7 jours / validés" },
    { value: `${notifiable} / ${patients.length}`, label: "patients joignables par notification" },
  ];

  const pFunnel = funnel(PATIENT_STAGES, patients.map((p) => p.stage));
  const kFunnel = funnel(KINE_STAGES, kines.map((k) => k.stage));
  const viaLink = patients.filter((p) => p.via === "lien").length;

  const pRows = patients.filter((p) =>
    filter === "tous" ? true : filter === "relancer" ? patientNeedsNudge(p) : filter === "inactifs" ? p.level !== "actif" : p.level === "actif",
  );
  const kRows = kines.filter((k) =>
    filter === "tous" ? true : filter === "relancer" ? kineNeedsNudge(k) : filter === "inactifs" ? k.level !== "actif" : k.level === "actif",
  );

  return (
    <section id="activite" aria-labelledby="activite-titre" className="mb-10 scroll-mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="activite-titre" className="font-display text-xl font-semibold text-slate-900">
          Activité
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {testCount > 0 && (
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={showTests} onChange={(e) => setShowTests(e.target.checked)} />
              Inclure les {testCount} comptes de test
            </label>
          )}
          {/* Alerte instantanée à chaque inscription kiné (lib/alerts/discord.ts). */}
          <form action={testDiscordAlert}>
            <SubmitButton pendingText="Envoi…" className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Tester l&apos;alerte Discord
            </SubmitButton>
          </form>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Qui utilise vraiment EasyPhysio, jusqu&apos;où chacun est allé, et qui relancer. « Vu » = dernière visite connue
        de Clerk ; « Séance » = dernière séance terminée par le patient.
      </p>

      {notice && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-slate-200 bg-white p-3">
            <dd className="font-mono text-xl font-semibold tabular-nums text-slate-900">{t.value}</dd>
            <dt className="mt-0.5 text-xs text-slate-500">{t.label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Funnel title="Parcours des patients" steps={pFunnel} foot={`${viaLink} arrivé${viaLink > 1 ? "s" : ""} par le lien / QR code du kiné, ${patients.length - viaLink} par invitation e-mail.`} />
        <Funnel title="Parcours des kinés" steps={kFunnel} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 text-sm" role="tablist">
          {(["patients", "kines"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 font-medium ${tab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {t === "patients" ? `Patients (${patients.length})` : `Kinés (${kines.length})`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {(
            [
              ["tous", "Tous"],
              ["relancer", `À relancer (${tab === "patients" ? toNudgeP.length : toNudgeK.length})`],
              ["inactifs", "Pas actifs"],
              ["actifs", "Actifs"],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-2.5 py-1 ${filter === f ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <NudgeAllBar kind={tab === "patients" ? "patient" : "kine"} count={tab === "patients" ? toNudgeP.length : toNudgeK.length} />

      <div className="mt-3 max-h-[28rem] overflow-auto rounded-2xl border border-slate-200 bg-white">
        {tab === "patients" ? (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Patient</th>
                <th className="px-3 py-2 font-medium">Arrivé</th>
                <th className="px-3 py-2 font-medium">Étape</th>
                <th className="px-3 py-2 font-medium">Séance</th>
                <th className="px-3 py-2 font-medium">7 j / 30 j</th>
                <th className="px-3 py-2 font-medium">Vu</th>
                <th className="px-3 py-2 font-medium">Notif.</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pRows.length === 0 && <EmptyRow cols={8} />}
              {pRows.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-slate-900">{p.code}</span>
                    {p.isTest && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-500">test</span>}
                    <div className="text-xs text-slate-500">{p.instructorName}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                    {dateFmt.format(new Date(p.createdAt))}
                    <div className="text-slate-400">{p.via === "lien" ? "lien / QR" : "invitation"}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {PATIENT_STAGES.find((s) => s.key === p.stage)?.label}
                    {p.subscription && <div className="text-slate-400">{SUB[p.subscription] ?? p.subscription}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${LEVEL[p.level].tone}`}>{LEVEL[p.level].label}</span>
                    <div className="mt-0.5 text-slate-500">{ago(p.lastSessionAt, now)}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums text-slate-700">
                    {p.sessions7d} / {p.sessions30d}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{ago(p.lastSeenAt, now)}</td>
                  <td className="px-3 py-2">
                    <NotifIcon on={p.notifiable} platforms={p.platforms} />
                  </td>
                  <td className="px-3 py-2 text-right">{p.notifiable && <NudgeOne id={p.id} kind="patient" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Kiné</th>
                <th className="px-3 py-2 font-medium">Inscrit</th>
                <th className="px-3 py-2 font-medium">Étape</th>
                <th className="px-3 py-2 font-medium">Activité</th>
                <th className="px-3 py-2 font-medium">Patients actifs</th>
                <th className="px-3 py-2 font-medium">Dernier programme</th>
                <th className="px-3 py-2 font-medium">Notif.</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kRows.length === 0 && <EmptyRow cols={8} />}
              {kRows.map((k) => (
                <tr key={k.id} className="align-top">
                  <td className="px-3 py-2">
                    <span className="text-slate-900">{k.name}</span>
                    {k.isTest && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-500">test</span>}
                    <div className="text-xs text-slate-500">{k.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{dateFmt.format(new Date(k.createdAt))}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {KINE_STAGES.find((s) => s.key === k.stage)?.label}
                    {k.status !== "approved" && <div className="text-slate-400">{k.status === "pending" ? "en attente" : k.status === "suspended" ? "suspendu" : "refusé"}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${LEVEL[k.level].tone}`}>{LEVEL[k.level].label}</span>
                    <div className="mt-0.5 text-slate-500">vu {ago(k.lastSeenAt, now)}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums text-slate-700">
                    {k.activePatients} / {k.patients}
                    <div className="font-sans text-slate-400">{k.sessions7d} séance{k.sessions7d > 1 ? "s" : ""} en 7 j</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{ago(k.lastProgrammeAt, now)}</td>
                  <td className="px-3 py-2">
                    <NotifIcon on={k.notifiable} platforms={k.platforms} />
                  </td>
                  <td className="px-3 py-2 text-right">{k.notifiable && k.status === "approved" && <NudgeOne id={k.id} kind="kine" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Une relance envoie sur le téléphone un message neutre (« Vos exercices vous attendent sur EasyPhysio. » / « Vos
        patients vous attendent… »), sans nom ni soin. Seules les personnes qui ont l&apos;appli ou le site installé avec
        les notifications activées peuvent la recevoir. Les patients ayant les notifications reçoivent déjà le rappel
        automatique de 17 h quand ils n&apos;ont pas fait de séance depuis la veille.
      </p>
    </section>
  );
}

function Funnel({ title, steps, foot }: { title: string; steps: { key: string; label: string; count: number }[]; foot?: string }) {
  const top = Math.max(1, steps[0]?.count ?? 1);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ol className="mt-3 space-y-1.5">
        {steps.map((s) => (
          <li key={s.key} className="grid grid-cols-[9rem_1fr_3.5rem] items-center gap-2 text-xs">
            <span className="text-slate-600">{s.label}</span>
            <span className="h-2 rounded-full bg-slate-100">
              <span className="block h-2 rounded-full bg-slate-700" style={{ width: `${(s.count / top) * 100}%` }} />
            </span>
            <span className="text-right font-mono tabular-nums text-slate-900">
              {s.count}
              <span className="ml-1 text-slate-400">{Math.round((s.count / top) * 100)}%</span>
            </span>
          </li>
        ))}
      </ol>
      {foot && <p className="mt-3 text-xs text-slate-500">{foot}</p>}
    </div>
  );
}

function NotifIcon({ on, platforms }: { on: boolean; platforms: string[] }) {
  const label = on ? `Notifications : ${platforms.map((p) => (p === "web" ? "site installé" : p === "ios" ? "iPhone" : "Android")).join(", ")}` : "Pas de notifications";
  return on ? (
    <Bell className="h-4 w-4 text-emerald-600" strokeWidth={1.75} aria-label={label}>
      <title>{label}</title>
    </Bell>
  ) : (
    <BellOff className="h-4 w-4 text-slate-300" strokeWidth={1.75} aria-label={label}>
      <title>{label}</title>
    </BellOff>
  );
}

function NudgeOne({ id, kind }: { id: string; kind: "patient" | "kine" }) {
  return (
    <form action={nudgeOne}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <SubmitButton pendingText="Envoi…" className="whitespace-nowrap rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        Relancer
      </SubmitButton>
    </form>
  );
}

function NudgeAllBar({ kind, count }: { kind: "patient" | "kine"; count: number }) {
  if (count === 0) return null;
  const who = kind === "patient" ? "patient" : "kiné";
  const why = kind === "patient" ? "ont un programme mais pas de séance depuis plus de 7 jours" : "ne sont pas venus depuis plus de 7 jours";
  return (
    <details className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
        <Send className="h-4 w-4" strokeWidth={1.75} />
        Relancer les {count} {who}
        {count > 1 ? "s" : ""} qui {why}
      </summary>
      <form action={nudgeAll} className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        <input type="hidden" name="kind" value={kind} />
        <span>Chacun reçoit une notification sur son téléphone. À éviter plus d&apos;une fois par semaine.</span>
        <SubmitButton pendingText="Envoi…" className="rounded-lg bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800">
          Confirmer l&apos;envoi
        </SubmitButton>
      </form>
    </details>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-6 text-center text-sm text-slate-400">
        Personne dans cette catégorie.
      </td>
    </tr>
  );
}
