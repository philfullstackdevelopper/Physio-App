// Configure Stripe pour le modèle de facturation actuel (lib/billing/patientPlans.ts :
// abonnement d'accès du patient sur le compte EasyPhysio + 6 € d'honoraires
// prélevés sur le compte Connect du kiné), EN UNE COMMANDE :
//
//   node scripts/configurer-stripe.mjs
//
// Ce que fait le script (mode TEST seulement — il refuse une clé réelle) :
//   1. Webhook « plateforme » (événements du compte EasyPhysio) : paiement
//      terminé (checkout.session.completed), abonnements d'accès des patients
//      (customer.subscription.created / updated / deleted) et anciennes
//      factures des kinés (invoice.*).
//   2. Webhook « Connect » (événements des comptes Stripe des kinés) :
//      activation / déconnexion du compte du kiné, paiement des honoraires du
//      mois, remboursements et litiges. Le crée s'il manque.
//   3. Met le secret de ce webhook Connect dans Scalingo
//      (STRIPE_CONNECT_WEBHOOK_SECRET) puis redémarre le site — le secret
//      n'est jamais affiché.
//   4. N'active PAS le prélèvement SEPA (audit du 2026-11-08) : les patients
//      paient par carte seulement (la carte est copiée chez le kiné, un
//      mandat SEPA ne peut pas l'être ; les pages de paiement le forcent).
//   5. Vérifie le résultat et l'affiche.
// Le même réglage est à faire à la main dans le tableau de bord Stripe en
// mode RÉEL (Développeurs → Webhooks), avec les listes PLATFORM et CONNECT ci-dessous.
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
const PLATFORM = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.marked_uncollectible",
];
const CONNECT = [
  "checkout.session.completed",
  "account.updated",
  "account.application.deauthorized",
  "payment_intent.succeeded",
  "payment_intent.processing",
  "payment_intent.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.closed",
];
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
  await stripe.webhookEndpoints.update(platform.id, { enabled_events: PLATFORM, description: "EasyPhysio — compte plateforme (abonnements patients)" });
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

// 4. SEPA : rien à activer — les pages de paiement des patients imposent la
// carte (payment_method_types: ["card"]), quel que soit ce réglage.
ok("moyens de paiement : carte seulement (imposé par le code, rien à régler)");

// 5. Vérification.
console.log("\nVérification :");
const after = (await stripe.webhookEndpoints.list({ limit: 100 })).data.filter((h) => h.url === URL_WEBHOOK);
for (const h of after) console.log(`  ${isConnect(h) ? "Connect   " : "plateforme"} : ${h.status}, ${h.enabled_events.length} événements`);
console.log("\nTerminé. Stripe est prêt en mode test.");
