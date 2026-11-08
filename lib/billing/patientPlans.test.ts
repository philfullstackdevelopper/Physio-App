import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EARLY_ACCESS_PLAN_KEY,
  KINE_FOLLOW_UP_CENTS,
  KINE_NET_CENTS,
  PLATFORM_OFFERS,
  TRIAL_DAYS,
  commitmentEnd,
  commitmentEndOfSubscription,
  kineFollowUpChargeable,
  monthlyTotalCents,
  offersSummaryFR,
  patientMustSubscribe,
  platformNetCents,
  platformOffer,
  stripeFeeCents,
  subscriptionGivesAccess,
  subscriptionNeedsRefresh,
} from "./patientPlans.ts";

// Modèle définitif (Philippe, 2026-11-04) : trois offres d'accès + 6 € du kiné.

test("trois offres : 12,99 / 9,99 / 8,99 € = accès 6,99 / 3,99 / 2,99 € + 6,00 € pour le kiné", () => {
  assert.deepEqual(PLATFORM_OFFERS.map((o) => o.platformCents), [699, 399, 299]);
  assert.deepEqual(PLATFORM_OFFERS.map(monthlyTotalCents), [1299, 999, 899]);
  assert.deepEqual(PLATFORM_OFFERS.map((o) => o.commitmentMonths), [0, 3, 6]);
  assert.equal(KINE_FOLLOW_UP_CENTS, 600);
  assert.equal(TRIAL_DAYS, 10);
  assert.equal(offersSummaryFR(), "12,99 € sans engagement, 9,99 € avec un engagement de 3 mois ou 8,99 € avec 6 mois");
});

test("ce que chacun garde : kiné ≈ 5,66 € quelle que soit l'offre ; EasyPhysio selon l'offre", () => {
  assert.equal(stripeFeeCents(600), 34);
  assert.equal(KINE_NET_CENTS, 566);
  // Sans TVA (micro-entreprise) : EasyPhysio garde le prix moins les frais de carte.
  assert.deepEqual(PLATFORM_OFFERS.map(platformNetCents), [664, 368, 270]);
});

test("engagement : compté à partir du premier mois payé (après l'essai)", () => {
  const start = new Date("2026-12-14T12:00:00Z");
  assert.equal(commitmentEnd(platformOffer("plan_1m"), start), null);
  assert.equal(commitmentEnd(platformOffer("plan_3m"), start)?.slice(0, 10), "2027-03-14");
  assert.equal(commitmentEnd(platformOffer("plan_6m"), start)?.slice(0, 10), "2027-06-14");
});

const now = new Date("2026-12-10T12:00:00Z");
const later = "2027-01-10T12:00:00Z";
const past = "2026-12-01T12:00:00Z";
const platform = (plan: string, status: string, end = later, cancel = false) => ({
  plan,
  status,
  current_period_end: end,
  cancel_at_period_end: cancel,
  stripe_account_id: null,
});

test("accès : abonnement d'accès actif ou en essai = accès, même résilié jusqu'à la fin du mois", () => {
  assert.equal(subscriptionGivesAccess(platform("plan_3m", "trialing"), now), true);
  assert.equal(subscriptionGivesAccess(platform("plan_6m", "active", later, true), now), true);
  assert.equal(subscriptionGivesAccess(platform("plan_1m", "active", past, true), now), false);
  assert.equal(subscriptionGivesAccess(platform("plan_1m", "past_due"), now), false);
  assert.equal(subscriptionGivesAccess(platform(EARLY_ACCESS_PLAN_KEY, "active"), now), true);
});

test("ancien modèle : une formule sur le compte du kiné reste valable jusqu'à sa fin, puis plus jamais", () => {
  const legacy = (end: string) => ({ plan: "plan_3m", status: "active", current_period_end: end, cancel_at_period_end: false, stripe_account_id: "acct_kine" });
  assert.equal(subscriptionGivesAccess(legacy(later), now), true);
  assert.equal(subscriptionGivesAccess(legacy(past), now), false);
  assert.equal(subscriptionGivesAccess({ ...platform("kine_pro", "active") }, now), false);
});

test("les 6 € du kiné : jamais pendant l'essai, jamais sans abonnement d'accès actif", () => {
  assert.equal(kineFollowUpChargeable(platform("plan_1m", "active"), now), true);
  assert.equal(kineFollowUpChargeable(platform("plan_6m", "trialing"), now), false);
  assert.equal(kineFollowUpChargeable(platform("plan_3m", "past_due"), now), false);
  assert.equal(kineFollowUpChargeable({ ...platform("plan_1m", "active"), stripe_account_id: "acct_kine" }, now), false);
  assert.equal(kineFollowUpChargeable(null, now), false);
});

test("paywall : obligatoire sauf kiné suspendu, accès offert (test) ou abonnement valide", () => {
  const base = { kineSuspended: false, freeAccessUntil: null, subscription: null, now };
  assert.equal(patientMustSubscribe(base), true);
  assert.equal(patientMustSubscribe({ ...base, kineSuspended: true }), false);
  assert.equal(patientMustSubscribe({ ...base, freeAccessUntil: later }), false);
  assert.equal(patientMustSubscribe({ ...base, subscription: platform("plan_3m", "trialing") }), false);
});

test("relecture chez Stripe quand la période est dépassée", () => {
  assert.equal(subscriptionNeedsRefresh(platform("plan_1m", "active", past), now), true);
  assert.equal(subscriptionNeedsRefresh(platform("plan_1m", "active", later), now), false);
});

test("fin d'engagement : calculée depuis la fin réelle de l'essai, ou le début de l'abonnement", () => {
  const trialEnd = Date.UTC(2026, 10, 18, 12) / 1000; // 18 novembre 2026
  const start = Date.UTC(2026, 10, 8, 12) / 1000;
  const sixMonths = commitmentEndOfSubscription({ plan: "plan_6m", trial_end: trialEnd, start_date: start });
  assert.equal(sixMonths, commitmentEnd(platformOffer("plan_6m"), new Date(trialEnd * 1000)));
  assert.equal(new Date(sixMonths!).getUTCMonth(), 4); // mai 2027
  // Sans essai : depuis le début.
  const threeMonths = commitmentEndOfSubscription({ plan: "plan_3m", trial_end: null, start_date: start });
  assert.equal(new Date(threeMonths!).getUTCMonth(), 1); // février 2027
  // Sans engagement, ou formule inconnue : pas de fin d'engagement.
  assert.equal(commitmentEndOfSubscription({ plan: "plan_1m", trial_end: trialEnd, start_date: start }), null);
  assert.equal(commitmentEndOfSubscription({ plan: "patient_monthly", start_date: start, commit_until: "x" }), null);
  // Dates absentes : la metadata posée à l'ouverture du paiement sert de secours.
  assert.equal(commitmentEndOfSubscription({ plan: "plan_3m", commit_until: "2027-02-18T00:00:00.000Z" }), "2027-02-18T00:00:00.000Z");
});

test("un seul abonnement : un abonnement en essai ou actif (même résilié) bloque une nouvelle souscription", () => {
  const future = "2099-01-01T00:00:00Z";
  const base = { plan: "plan_3m", current_period_end: future, cancel_at_period_end: false, stripe_account_id: null };
  assert.equal(subscriptionGivesAccess({ ...base, status: "trialing" }), true);
  assert.equal(subscriptionGivesAccess({ ...base, status: "active", cancel_at_period_end: true }), true);
  assert.equal(subscriptionGivesAccess({ ...base, status: "past_due" }), false);
  assert.equal(subscriptionGivesAccess({ ...base, status: "canceled" }), false);
});
