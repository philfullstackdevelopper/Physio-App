#!/usr/bin/env node
// Lancé par la tâche planifiée Scalingo (cron.json), le 1er de chaque mois :
// demande à l'appli de facturer aux kinés le mois qui vient de se terminer
// (app/api/cron/facturation/route.ts). Passe par l'adresse *.scalingo.io, qui
// répond sans redirection (comme pour les webhooks Stripe).
const base = process.env.CRON_TARGET_URL ?? "https://easyphysio.osc-fr1.scalingo.io";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET manquant : facturation non lancée.");
  process.exit(1);
}

const res = await fetch(`${base}/api/cron/facturation`, {
  method: "POST",
  headers: { authorization: `Bearer ${secret}` },
});
const body = await res.text();
console.log(`[cron facturation] HTTP ${res.status} ${body}`);
if (!res.ok && res.status !== 207) process.exit(1);
