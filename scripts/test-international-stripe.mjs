// Essai de bout en bout, en MODE TEST Stripe uniquement, du circuit d'argent
// international (2026-11-18). Pour chaque pays demandé, avec les montants de
// lib/billing/patientPlans.ts (COUNTRY / CURRENCY_PRICES) :
//   1. compte Stripe du kiné créé dans SON pays — d'abord comme le fait l'appli
//      (compte Standard + lien d'inscription), puis un compte de test déjà
//      complété (Custom) pour pouvoir encaisser sans remplir le formulaire ;
//   2. abonnement d'accès du patient sur le compte d'EasyPhysio, dans la
//      monnaie du pays, mention TVA du pays sur la facture ;
//   3. copie de la carte du patient chez le kiné (comme ensureKineCard) ;
//   4. prélèvement des honoraires du kiné sur SON compte, dans la monnaie du
//      pays, sans aucun frais de plateforme (0 % pour EasyPhysio).
// Tout ce qui est créé est en mode test ; les comptes de test sont supprimés
// à la fin. Refuse de tourner avec une clé réelle (sk_live).
//
// Usage : node --env-file=<chemin>/.env.local scripts/test-international-stripe.mjs FR CH GB
import Stripe from "stripe";
import { pricingForCountry, platformOfferIn, platformInvoiceFooter } from "../lib/billing/patientPlans.ts";
import { countryConfig } from "../lib/billing/countries.ts";

const key = process.env.STRIPE_SECRET_KEY ?? "";
if (!key.startsWith("sk_test_")) {
  console.error("Clé Stripe de TEST requise (sk_test_…) : rien n'est fait.");
  process.exit(1);
}
const stripe = new Stripe(key);
// Plateforme française : les comptes complétés par la plateforme passent par un
// « account token », créé avec la clé publique (comme le ferait le navigateur).
const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
if (!pk.startsWith("pk_test_")) {
  console.error("Clé publique Stripe de TEST requise (pk_test_…) : rien n'est fait.");
  process.exit(1);
}
const stripePk = new Stripe(pk);
const countries = process.argv.slice(2).length ? process.argv.slice(2) : ["FR", "CH"];

// Données de test pour un compte déjà complété, par pays (IBAN/numéros publiés par Stripe pour le mode test).
const BANK = {
  FR: { country: "FR", currency: "eur", account_number: "FR1420041010050500013M02606" },
  CH: { country: "CH", currency: "chf", account_number: "CH9300762011623852957" },
  IE: { country: "IE", currency: "eur", account_number: "IE29AIBK93115212345678" },
  GB: { country: "GB", currency: "gbp", account_number: "00012345", routing_number: "108800" },
  US: { country: "US", currency: "usd", account_number: "000123456789", routing_number: "110000000" },
  CA: { country: "CA", currency: "cad", account_number: "000123456789", routing_number: "11000-000" },
};
const ADDRESS = {
  FR: { line1: "address_full_match", city: "Paris", postal_code: "75001" },
  CH: { line1: "address_full_match", city: "Genève", postal_code: "1201" },
  IE: { line1: "address_full_match", city: "Dublin", postal_code: "D02 X285", state: "D" },
  GB: { line1: "address_full_match", city: "London", postal_code: "EC1A 1BB" },
  US: { line1: "address_full_match", city: "San Francisco", postal_code: "94103", state: "CA" },
  CA: { line1: "address_full_match", city: "Montréal", postal_code: "H2X 1Y4", state: "QC" },
};
const PHONE = { FR: "+33612345678", CH: "+41791234567", IE: "+353851234567", GB: "+447911123456", US: "+14155550123", CA: "+15145550123" };

const results = [];
const cleanup = [];

async function runCountry(code) {
  const out = { country: code, steps: [] };
  const step = (name, ok, detail) => {
    out.steps.push({ name, ok, detail });
    console.log(`  ${ok ? "OK " : "ÉCHEC"} ${name}${detail ? " — " + detail : ""}`);
  };
  console.log(`\n=== ${code} (${countryConfig(code)?.status ?? "inconnu"}) ===`);
  const pricing = pricingForCountry(code);
  if (!pricing) {
    step("pays ouvert dans lib/billing/countries.ts", false, "pays fermé : l'appli refuse inscription et paiements");
    return out;
  }
  step("montants du pays", true, `${pricing.currency.toUpperCase()} accès ${JSON.stringify(pricing.platform)} / kiné ${pricing.kineFollowUp}`);
  const tag = `intl-test-${code}-${Date.now()}`;

  // 1a. Comme l'appli (app/dashboard/connect/actions.ts) : compte Standard dans le pays du kiné.
  try {
    const std = await stripe.accounts.create({ type: "standard", email: `${tag}@example.com`, country: code });
    cleanup.push(std.id);
    const link = await stripe.accountLinks.create({ account: std.id, refresh_url: "https://easyphysio.fr/r", return_url: "https://easyphysio.fr/ok", type: "account_onboarding" });
    step("compte Standard du kiné + lien d'inscription", std.country === code && !!link.url, `${std.id}, pays ${std.country}, monnaie par défaut ${std.default_currency}`);
  } catch (e) {
    step("compte Standard du kiné + lien d'inscription", false, e.message);
  }

  // 1b. Compte de test déjà complété, pour encaisser (Custom, mode test seulement).
  let acct;
  try {
    const bank = BANK[code];
    const token = await stripePk.tokens.create({
      account: {
        business_type: "individual",
        tos_shown_and_accepted: true,
        individual: {
        first_name: "Test",
        last_name: "Kine",
        email: `${tag}@example.com`,
        phone: PHONE[code],
        dob: { day: 1, month: 1, year: 1901 },
        address: { ...ADDRESS[code], country: code },
        ...(code === "US" ? { ssn_last_4: "0000", id_number: "000000000" } : {}),
        ...(code === "CA" ? { id_number: "000000000" } : {}),
          ...(code === "IE" ? { nationality: "IE" } : {}),
        },
      },
    });
    acct = await stripe.accounts.create({
      type: "custom",
      country: code,
      email: `${tag}@example.com`,
      account_token: token.id,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_profile: { mcc: "8099", url: "https://easyphysio.fr", product_description: "Physiotherapy home-exercise programme follow-up" },
      external_account: { object: "bank_account", ...bank },
    });
    cleanup.push(acct.id);
    // Laisse Stripe vérifier les données de test.
    for (let i = 0; i < 40; i++) {
      acct = await stripe.accounts.retrieve(acct.id);
      if (acct.charges_enabled) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
    step("compte du kiné prêt à encaisser", acct.charges_enabled, `${acct.id}, charges_enabled=${acct.charges_enabled}${acct.charges_enabled ? "" : ", exigences " + JSON.stringify({ due: acct.requirements?.currently_due, pending: acct.requirements?.pending_verification, reason: acct.requirements?.disabled_reason, errors: acct.requirements?.errors })}`);
  } catch (e) {
    step("compte du kiné prêt à encaisser", false, e.message);
    return out;
  }

  // 2. Abonnement d'accès sur le compte d'EasyPhysio, monnaie du pays.
  const offer = platformOfferIn("plan_3m", pricing);
  const footer = platformInvoiceFooter(code);
  let customer, sub;
  try {
    customer = await stripe.customers.create({ email: `${tag}-patient@example.com`, name: "Patient Test", invoice_settings: { footer }, metadata: { test: tag } });
    const pm = await stripe.paymentMethods.attach("pm_card_visa", { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
    const product = await stripe.products.create({ name: `Accès à la plateforme EasyPhysio — ${offer.label.toLowerCase()} (test ${code})` });
    sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price_data: { currency: pricing.currency, unit_amount: offer.platformCents, recurring: { interval: "month" }, product: product.id } }],
      default_payment_method: pm.id,
      expand: ["latest_invoice"],
    });
    const inv = sub.latest_invoice;
    step(
      "abonnement d'accès (compte EasyPhysio)",
      sub.status === "active" && inv.currency === pricing.currency && inv.amount_paid === offer.platformCents,
      `${sub.status}, facture ${inv.amount_paid} ${inv.currency}, mention « ${inv.footer} »`,
    );
    await stripe.products.update(product.id, { active: false });
  } catch (e) {
    step("abonnement d'accès (compte EasyPhysio)", false, e.message);
    return out;
  }

  // 3. Copie de la carte chez le kiné (comme ensureKineCard).
  let clone, kineCustomer;
  try {
    const pmId = typeof sub.default_payment_method === "string" ? sub.default_payment_method : sub.default_payment_method.id;
    clone = await stripe.paymentMethods.create({ customer: customer.id, payment_method: pmId }, { stripeAccount: acct.id });
    kineCustomer = await stripe.customers.create({ email: `${tag}-patient@example.com`, payment_method: clone.id }, { stripeAccount: acct.id });
    step("carte copiée sur le compte du kiné", !!clone.id, `${clone.id} → client ${kineCustomer.id}`);
  } catch (e) {
    step("carte copiée sur le compte du kiné", false, e.message);
    return out;
  }

  // 4. Honoraires du kiné sur SON compte, monnaie du pays, 0 % pour EasyPhysio.
  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: pricing.kineFollowUp,
        currency: pricing.currency,
        customer: kineCustomer.id,
        payment_method: clone.id,
        off_session: true,
        confirm: true,
        description: `Test ${code} : suivi mensuel du programme`,
        expand: ["latest_charge"],
      },
      { stripeAccount: acct.id },
    );
    const charge = pi.latest_charge;
    step(
      "honoraires du kiné (compte du kiné, sans frais plateforme)",
      pi.status === "succeeded" && pi.currency === pricing.currency && pi.amount === pricing.kineFollowUp && !pi.application_fee_amount && !charge?.application_fee,
      `${pi.status}, ${pi.amount} ${pi.currency}, application_fee=${pi.application_fee_amount ?? "aucun"}`,
    );
  } catch (e) {
    step("honoraires du kiné (compte du kiné, sans frais plateforme)", false, e.message);
  }

  try {
    await stripe.subscriptions.cancel(sub.id);
    await stripe.customers.del(customer.id);
  } catch {
    /* nettoyage au mieux */
  }
  return out;
}

for (const code of countries) results.push(await runCountry(code.toUpperCase()));

for (const id of cleanup) {
  try {
    await stripe.accounts.del(id);
  } catch {
    /* un compte Standard peut refuser la suppression : sans effet en mode test */
  }
}

console.log("\n=== Résumé ===");
for (const r of results) console.log(`${r.country} : ${r.steps.every((s) => s.ok) ? "tout OK" : "ÉCHEC à « " + (r.steps.find((s) => !s.ok)?.name ?? "?") + " »"}`);
process.exit(results.every((r) => r.steps.every((s) => s.ok)) ? 0 : 1);
