// Configure Stripe pour le modèle de facturation actuel (bilan mensuel payé au
// kiné + facture EasyPhysio aux kinés), EN UNE COMMANDE :
//
//   node scripts/configurer-stripe.mjs
//
// Ce que fait le script (mode TEST seulement — il refuse une clé réelle) :
//   1. Webhook « plateforme » (événements du compte EasyPhysio) : garde
//      checkout.session.completed, ajoute les factures des kinés
//      (invoice.paid / payment_failed / marked_uncollectible), retire les
//      anciens événements d'abonnement patient.
//   2. Webhook « Connect » (événements des comptes Stripe des kinés) : carte
//      enregistrée par le patient, paiement du bilan du mois, activation du
//      compte du kiné. Le créé s'il manque.
//   3. Met le secret de ce webhook Connect dans Scalingo
//      (STRIPE_CONNECT_WEBHOOK_SECRET) puis redémarre le site — le secret
//      n'est jamais affiché.
//   4. Active le prélèvement SEPA (moyen de paiement des factures des kinés).
//   5. Vérifie le résultat et l'affiche.
// Sans risque à relancer : il ne recrée rien qui existe déjà.
// Prérequis : être connecté à la CLI Scalingo (déjà le cas sur ce poste).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Stripe = require("stripe");

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^STRIPE_SECRET_KEY=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!key) throw new Error("STRIPE_SECRET_KEY absente de .env.local.");
if (!key.startsWith("sk_test")) throw new Error("Clé Stripe réelle détectée : ce script ne configure que le mode test.");

const stripe = new Stripe(key);
const APP = ["--region", "osc-fr1", "--app", "easyphysio"];
const URL_WEBHOOK = "https://easyphysio.osc-fr1.scalingo.io/api/stripe/webhook";
const PLATFORM = ["checkout.session.completed", "invoice.paid", "invoice.payment_failed", "invoice.marked_uncollectible"];
const CONNECT = ["checkout.session.completed", "account.updated", "payment_intent.succeeded", "payment_intent.processing", "payment_intent.payment_failed"];
const ok = (m) => console.log("  ✔ " + m);

console.log("Configuration de Stripe (mode test)…");

// 1 et 2. Webhooks.
// Stripe ne dit pas, à la lecture, si un webhook est « Connect » : ce script
// reconnaît le sien à sa description (posée à la création).
const CONNECT_DESC = "EasyPhysio — comptes Connect des kinés (suivi, bilans, activation)";
const isConnect = (h) => h.description === CONNECT_DESC;
const hooks = (await stripe.webhookEndpoints.list({ limit: 100 })).data.filter((h) => h.url === URL_WEBHOOK);
const platform = hooks.find((h) => !isConnect(h));
let connect = hooks.find(isConnect);
if (platform) {
  await stripe.webhookEndpoints.update(platform.id, { enabled_events: PLATFORM, description: "EasyPhysio — compte plateforme (factures des kinés)" });
  ok("webhook plateforme : " + PLATFORM.join(", "));
} else {
  throw new Error("Webhook plateforme introuvable : créez-le dans Stripe (Développeurs → Webhooks) vers " + URL_WEBHOOK + ", puis relancez.");
}
let newSecret = null;
if (connect) {
  await stripe.webhookEndpoints.update(connect.id, { enabled_events: CONNECT });
  ok("webhook Connect (déjà présent) : " + CONNECT.join(", "));
} else {
  connect = await stripe.webhookEndpoints.create({
    url: URL_WEBHOOK,
    connect: true,
    enabled_events: CONNECT,
    description: CONNECT_DESC,
  });
  newSecret = connect.secret;
  ok("webhook Connect créé : " + CONNECT.join(", "));
}

// 3. Secret du webhook Connect dans Scalingo, puis redémarrage.
const scalingoEnv = execFileSync("scalingo", [...APP, "env"], { encoding: "utf8", shell: true });
const hasSecret = /^STRIPE_CONNECT_WEBHOOK_SECRET=whsec_/m.test(scalingoEnv);
if (newSecret) {
  execFileSync("scalingo", [...APP, "env-set", `STRIPE_CONNECT_WEBHOOK_SECRET=${newSecret}`], { stdio: "ignore", shell: true });
  execFileSync("scalingo", [...APP, "restart"], { stdio: "ignore", shell: true });
  ok("secret enregistré dans Scalingo, site redémarré");
} else if (hasSecret) {
  ok("secret déjà présent dans Scalingo");
} else {
  // Le webhook existe mais Scalingo n'a pas son secret (Stripe ne le
  // redonne qu'à la création) : on le remplace par un neuf.
  await stripe.webhookEndpoints.del(connect.id);
  const fresh = await stripe.webhookEndpoints.create({ url: URL_WEBHOOK, connect: true, enabled_events: CONNECT, description: CONNECT_DESC });
  execFileSync("scalingo", [...APP, "env-set", `STRIPE_CONNECT_WEBHOOK_SECRET=${fresh.secret}`], { stdio: "ignore", shell: true });
  execFileSync("scalingo", [...APP, "restart"], { stdio: "ignore", shell: true });
  ok("webhook Connect recréé, secret enregistré dans Scalingo, site redémarré");
}

// 4. SEPA.
const cfg = (await stripe.paymentMethodConfigurations.list({ limit: 20 })).data.find((c) => c.is_default && !c.application);
if (cfg) {
  await stripe.paymentMethodConfigurations.update(cfg.id, { sepa_debit: { display_preference: { preference: "on" } } });
  ok("prélèvement SEPA activé");
} else {
  console.log("  ! configuration des moyens de paiement introuvable : activez SEPA dans Stripe (Paramètres → Moyens de paiement)");
}

// 5. Vérification.
console.log("\nVérification :");
const after = (await stripe.webhookEndpoints.list({ limit: 100 })).data.filter((h) => h.url === URL_WEBHOOK);
for (const h of after) console.log(`  ${isConnect(h) ? "Connect   " : "plateforme"} : ${h.status}, ${h.enabled_events.length} événements`);
if (cfg) {
  const c = await stripe.paymentMethodConfigurations.retrieve(cfg.id);
  console.log(`  SEPA      : ${c.sepa_debit?.display_preference?.value === "on" ? "activé" : "NON activé"}`);
}
console.log("\nTerminé. Stripe est prêt en mode test.");
