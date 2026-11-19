import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";
import { loadDashboardHome } from "@/lib/dashboard/homeData";
import { loadUnreadMessages } from "@/lib/dashboard/unreadMessages";
import DashboardHomeView from "@/components/DashboardHomeView";
import { getLibI18n } from "@/lib/dashboard/libI18n";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import FirstSteps, { FIRST_STEPS_COOKIE, type FirstStep } from "@/components/FirstSteps";
import { cabinetView } from "@/lib/db/cabinets";
import { canInvitePatients } from "@/lib/launch";
import { FRANCE_PRICING, KINE_PRICE_MAX_CENTS, TRIAL_DAYS, moneyLabel, pricingForCountry, withKinePrice } from "@/lib/billing/patientPlans";
import type { Locale } from "@/i18n/locales";
import { intlTag } from "@/lib/i18n/translator";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const instructor = await getInstructor(supabase, user.id);
  if (!instructor) redirect("/patient");
  // Compte pas (encore) validé : app/dashboard/layout.tsx affiche déjà l'écran
  // d'attente ou de refus ; cette page ne charge rien (audit du 2026-10-08).
  // Pas de redirect("/dashboard") ici, comme dans requireApprovedInstructor :
  // on y est déjà, ce serait une boucle.
  if (((instructor.status as string | null) ?? "approved") !== "approved") return null;

  // Les trois lectures sont indépendantes : en même temps (audit du
  // 2026-11-16, C7 — « Premiers pas » ajoutait 3 lectures à la suite).
  const libI18n = await getLibI18n();
  const [h, unread, firstSteps] = await Promise.all([
    loadDashboardHome(supabase, user.id, new Date(), libI18n),
    loadUnreadMessages(supabase, user.id),
    firstStepsFor(supabase, user.id, user.email),
  ]);
  // Une ligne par patient : on garde le message le plus récent de chacun.
  const unreadByPatient = new Map<string, (typeof unread)[number]>();
  for (const m of unread) {
    const existing = unreadByPatient.get(m.patientId);
    if (!existing || m.createdAt > existing.createdAt) unreadByPatient.set(m.patientId, m);
  }
  const unreadRows = [...unreadByPatient.values()].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

  return <DashboardHomeView h={h} unreadRows={unreadRows} firstSteps={firstSteps} />;
}

// « Premiers pas » (Philippe, 2026-11-16) : un patient, les paiements, le
// cabinet. Rien n'est affiché si le kiné a fermé la carte ou si tout est fait.
// 2026-11-19 (Philippe) : d'abord « Fixer votre prix » (fait dès qu'il l'a
// enregistré une fois, même à 6 € — une hausse ultérieure demande l'accord de
// chaque patient, d'où l'intérêt de le fixer avant le premier patient), et une
// courte explication de sa rémunération dans la carte.
async function firstStepsFor(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, email: string | null) {
  if ((await cookies()).get(FIRST_STEPS_COOKIE)?.value === "1") return null;
  const t = await getTranslations("dashboard.home.firstSteps");
  const tf = await getTranslations("billing.format");
  const locale = (await getLocale()) as Locale;
  const [{ count: patients }, { data: connect }, cabinet, { data: me }] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("instructor_id", userId),
    supabase.from("instructor_connect_accounts").select("status").eq("instructor_id", userId).maybeSingle(),
    cabinetView(userId).catch(() => null),
    supabase.from("instructors").select("country, review_price_cents").eq("id", userId).maybeSingle(),
  ]);
  const priceCents = (me?.review_price_cents as number | null) ?? null;
  const pricing = withKinePrice(pricingForCountry((me?.country as string | null) ?? null) ?? FRANCE_PRICING, priceCents);
  const price = pricing.kineFollowUp === 0 ? t("priceFree") : moneyLabel(pricing.kineFollowUp, pricing.currency, locale, (amount) => tf("eur", { amount }));
  const activeMembers = cabinet?.members.filter((m) => m.status === "active").length ?? 0;
  const invitationsOpen = canInvitePatients(email);
  const steps: FirstStep[] = [
    {
      key: "price",
      done: priceCents !== null,
      href: "/dashboard/facturation?prix=1",
      label: t("price"),
      hint: priceCents !== null ? t("priceDoneHint", { price }) : t("priceHint", { price }),
    },
    {
      key: "payments",
      done: connect?.status === "active",
      href: "/dashboard/facturation",
      label: t("payments"),
      hint: t("paymentsHint"),
    },
    {
      key: "patient",
      done: (patients ?? 0) > 0,
      href: "/dashboard/patients/new",
      label: t("patient"),
      hint: invitationsOpen ? t("patientHint") : t("patientClosed"),
    },
    !cabinet
      ? { key: "cabinet", done: false, href: "/dashboard/cabinet", label: t("cabinetNone"), hint: t("cabinetNoneHint") }
      : cabinet.me.status === "pending"
        ? { key: "cabinet", done: false, href: "/dashboard/cabinet", label: t("cabinetPending"), hint: cabinet.cabinet.name }
        : { key: "cabinet", done: activeMembers >= 2, href: "/dashboard/cabinet", label: t("cabinetInvite"), hint: t("cabinetInviteHint") },
  ];
  if (steps.every((s) => s.done)) return null;
  const maxPrice = new Intl.NumberFormat(intlTag(locale), { style: "currency", currency: pricing.currency.toUpperCase(), maximumFractionDigits: 0 }).format(KINE_PRICE_MAX_CENTS / 100);
  return <FirstSteps steps={steps} maxPrice={maxPrice} trialDays={TRIAL_DAYS} />;
}
